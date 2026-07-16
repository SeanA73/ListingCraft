"""ListingCraft — FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (  # noqa: E402
    User, UserPublic, RegisterRequest, LoginRequest, GoogleSessionRequest,
    GenerateRequest, RegenerateFieldRequest, ListingUpdateRequest,
    Listing, GeneratedListing, ListingScore,
    CheckoutRequest, PaymentTransaction,
    AnalyticsEventRequest, AnalyticsEvent,
    BulkGenerateRequest, now_utc_iso,
)
from auth import (  # noqa: E402
    hash_password, verify_password, create_jwt,
    set_auth_cookie, clear_auth_cookie,
    fetch_google_session, get_current_user_optional, require_user, to_public,
)
from listing_service import generate_listing, regenerate_field, compute_score  # noqa: E402
from payments import (  # noqa: E402
    PACKAGES, PLAN_LIMITS, STRIPE_API_KEY, effective_plan, compute_new_expiry,
)
from emergentintegrations.payments.stripe.checkout import (  # noqa: E402
    StripeCheckout, CheckoutSessionRequest,
)

# --- DB ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# --- App ---
app = FastAPI(title="ListingCraft API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("listingcraft")


# ---------- Helpers ----------
def _reset_usage_if_needed(user: dict) -> dict:
    """Reset monthly generation counter if 30 days have passed since period_start."""
    try:
        ps = datetime.fromisoformat(user.get("period_start"))
        if ps.tzinfo is None:
            ps = ps.replace(tzinfo=timezone.utc)
    except Exception:
        ps = datetime.now(timezone.utc)
    if datetime.now(timezone.utc) - ps >= timedelta(days=30):
        user["generations_used_this_period"] = 0
        user["period_start"] = datetime.now(timezone.utc).isoformat()
    return user


async def _check_and_increment_quota(user: dict) -> None:
    user = _reset_usage_if_needed(user)
    plan = effective_plan(user)
    limit = PLAN_LIMITS[plan]["monthly_generations"]
    used = user.get("generations_used_this_period", 0)
    if limit is not None and used >= limit:
        raise HTTPException(
            status_code=402,
            detail=f"Monthly generation limit reached on the {plan} plan. Upgrade to keep generating.",
        )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "generations_used_this_period": used + 1,
            "period_start": user["period_start"],
        }},
    )


async def _check_library_cap(user: dict) -> None:
    plan = effective_plan(user)
    cap = PLAN_LIMITS[plan]["library_cap"]
    if cap is None:
        return
    n = await db.listings.count_documents({"user_id": user["user_id"]})
    if n >= cap:
        raise HTTPException(
            status_code=402,
            detail=f"Free plan library is limited to {cap} listings. Upgrade or delete a listing.",
        )


# =========================================================
# AUTH
# =========================================================
@api.post("/auth/register")
async def auth_register(body: RegisterRequest, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="An account with that email already exists.")
    user = User(
        email=email,
        name=body.name.strip(),
        password_hash=hash_password(body.password),
        auth_provider="email",
    )
    await db.users.insert_one(user.model_dump())
    token = create_jwt(user.user_id)
    set_auth_cookie(response, token)
    await _log_event(user.user_id, "signup", {"provider": "email"})
    return {"user": to_public(user.model_dump()).model_dump(), "token": token}


@api.post("/auth/login")
async def auth_login(body: LoginRequest, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_jwt(user["user_id"])
    set_auth_cookie(response, token)
    return {"user": to_public(user).model_dump(), "token": token}


@api.post("/auth/session")
async def auth_google_session(body: GoogleSessionRequest, response: Response):
    """Exchange Emergent OAuth session_id for a persistent session."""
    data = await fetch_google_session(body.session_id)
    if not data or "email" not in data:
        raise HTTPException(status_code=401, detail="Invalid Google session")

    email = str(data["email"]).lower().strip()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        u = User(email=email, name=name, picture=picture, auth_provider="google")
        await db.users.insert_one(u.model_dump())
        user = u.model_dump()
        await _log_event(user["user_id"], "signup", {"provider": "google"})
    else:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"name": name, "picture": picture}},
        )

    # Store session
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_utc_iso(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {"user": to_public(user).model_dump()}


@api.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = _reset_usage_if_needed(user)
    # persist any downgrade / reset
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
        "generations_used_this_period": user["generations_used_this_period"],
        "period_start": user["period_start"],
    }})
    pub = to_public(user).model_dump()
    pub["plan"] = effective_plan(user)
    pub["limits"] = PLAN_LIMITS[pub["plan"]]
    return pub


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    tok = request.cookies.get("session_token")
    if tok:
        await db.user_sessions.delete_many({"session_token": tok})
    clear_auth_cookie(response)
    return {"ok": True}


# =========================================================
# LISTINGS
# =========================================================
@api.post("/listings/generate")
async def listings_generate(body: GenerateRequest, request: Request):
    user = await require_user(request, db)
    await _check_and_increment_quota(user)
    await _check_library_cap(user)

    try:
        gen = await generate_listing(
            product_description=body.product_description,
            image_base64=body.image_base64,
            image_mime=body.image_mime,
            category=body.category,
            price_point=body.price_point,
            target_buyer=body.target_buyer,
            tone=body.tone,
            session_id=f"gen-{user['user_id']}-{uuid.uuid4().hex[:6]}",
        )
    except Exception as e:
        log.exception("generation failed")
        # roll back the quota increment
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"generations_used_this_period": -1}},
        )
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)[:200]}")

    score = compute_score(gen)
    listing = Listing(
        user_id=user["user_id"],
        input=body.model_dump(exclude={"image_base64"}),
        generated=gen,
        score=score,
        tone=body.tone,
    )
    await db.listings.insert_one(listing.model_dump())
    await _log_event(user["user_id"], "listing_generated", {"tone": body.tone})
    return listing.model_dump()


@api.get("/listings")
async def listings_list(request: Request, q: Optional[str] = None):
    user = await require_user(request, db)
    query = {"user_id": user["user_id"]}
    if q:
        query["$or"] = [
            {"generated.title": {"$regex": q, "$options": "i"}},
            {"generated.description": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/listings/{listing_id}")
async def listings_get(listing_id: str, request: Request):
    user = await require_user(request, db)
    doc = await db.listings.find_one({"listing_id": listing_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api.patch("/listings/{listing_id}")
async def listings_update(listing_id: str, body: ListingUpdateRequest, request: Request):
    user = await require_user(request, db)
    doc = await db.listings.find_one({"listing_id": listing_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if body.generated is not None:
        doc["generated"] = body.generated.model_dump()
        doc["score"] = compute_score(body.generated).model_dump()
    doc["updated_at"] = now_utc_iso()
    await db.listings.update_one({"listing_id": listing_id}, {"$set": doc})
    return doc


@api.delete("/listings/{listing_id}")
async def listings_delete(listing_id: str, request: Request):
    user = await require_user(request, db)
    r = await db.listings.delete_one({"listing_id": listing_id, "user_id": user["user_id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.post("/listings/{listing_id}/duplicate")
async def listings_duplicate(listing_id: str, request: Request):
    user = await require_user(request, db)
    await _check_library_cap(user)
    doc = await db.listings.find_one({"listing_id": listing_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    new_doc = dict(doc)
    new_doc["listing_id"] = f"lst_{uuid.uuid4().hex[:16]}"
    new_doc["created_at"] = now_utc_iso()
    new_doc["updated_at"] = now_utc_iso()
    if new_doc["generated"].get("title"):
        new_doc["generated"]["title"] = ("Copy — " + new_doc["generated"]["title"])[:140]
    to_insert = dict(new_doc)
    await db.listings.insert_one(to_insert)
    return new_doc


@api.post("/listings/{listing_id}/regenerate")
async def listings_regen_field(listing_id: str, body: RegenerateFieldRequest, request: Request):
    user = await require_user(request, db)
    await _check_and_increment_quota(user)
    doc = await db.listings.find_one({"listing_id": listing_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    tone = body.tone or doc.get("tone", "warm")
    try:
        result = await regenerate_field(
            field=body.field,
            listing_input=doc.get("input", {}),
            current_generated=doc.get("generated", {}),
            tone=tone,
            length=body.length,
            session_id=f"regen-{user['user_id']}-{uuid.uuid4().hex[:6]}",
        )
    except Exception as e:
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"generations_used_this_period": -1}})
        raise HTTPException(status_code=502, detail=f"AI regeneration failed: {str(e)[:200]}")

    gen = doc.get("generated", {})
    if body.field in ("title", "description"):
        gen[body.field] = str(result.get(body.field, gen.get(body.field, "")))
    elif body.field == "tags":
        raw = result.get("tags") or []
        seen = set(); out = []
        for t in raw:
            t = str(t)[:20].strip().lower()
            if t and t not in seen:
                seen.add(t); out.append(t)
            if len(out) == 13: break
        gen["tags"] = out
    elif body.field == "attributes":
        a = result.get("attributes") or {}
        if isinstance(a, dict):
            gen["attributes"] = {k: str(v) for k, v in a.items()}
    elif body.field == "alt_text":
        arr = result.get("alt_text") or []
        gen["alt_text"] = [str(x).strip() for x in arr if str(x).strip()][:10]
    elif body.field == "keywords":
        arr = result.get("keywords") or []
        kw = []
        for k in arr:
            if isinstance(k, dict) and k.get("phrase"):
                try:
                    rel = int(k.get("relevance", 60))
                except Exception:
                    rel = 60
                kw.append({"phrase": str(k["phrase"]).strip(), "relevance": max(0, min(100, rel))})
        gen["keywords"] = kw[:20]

    # recompute score
    doc["generated"] = gen
    doc["score"] = compute_score(GeneratedListing(**gen)).model_dump()
    doc["tone"] = tone
    doc["updated_at"] = now_utc_iso()
    await db.listings.update_one({"listing_id": listing_id}, {"$set": doc})
    return doc


@api.post("/listings/bulk")
async def listings_bulk(body: BulkGenerateRequest, request: Request):
    user = await require_user(request, db)
    plan = effective_plan(user)
    if not PLAN_LIMITS[plan]["bulk"]:
        raise HTTPException(status_code=402, detail="Bulk mode is a Pro feature.")
    if len(body.products) > 10:
        raise HTTPException(status_code=400, detail="Max 10 products per bulk run.")
    results = []
    for p in body.products:
        await _check_and_increment_quota(user)
        try:
            gen = await generate_listing(
                product_description=p.product_description,
                image_base64=p.image_base64,
                image_mime=p.image_mime,
                category=p.category, price_point=p.price_point, target_buyer=p.target_buyer,
                tone=p.tone,
                session_id=f"bulk-{user['user_id']}-{uuid.uuid4().hex[:6]}",
            )
            score = compute_score(gen)
            listing = Listing(user_id=user["user_id"], input=p.model_dump(exclude={"image_base64"}),
                              generated=gen, score=score, tone=p.tone)
            await db.listings.insert_one(listing.model_dump())
            results.append(listing.model_dump())
        except Exception as e:
            results.append({"error": str(e)[:200], "input": p.product_description[:100]})
    return {"results": results}


# =========================================================
# PAYMENTS
# =========================================================
@api.get("/plans")
async def plans_list():
    return {
        "packages": [
            {"id": pid, **{k: v for k, v in p.items() if k != "days"}, "days": p["days"]}
            for pid, p in PACKAGES.items()
        ],
        "limits": PLAN_LIMITS,
    }


@api.post("/payments/checkout")
async def payments_checkout(body: CheckoutRequest, request: Request):
    user = await require_user(request, db)
    if body.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Unknown package.")
    pkg = PACKAGES[body.package_id]
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/checkout-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"

    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    req = CheckoutSessionRequest(
        amount=float(pkg["amount"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "package_id": body.package_id,
            "plan": pkg["plan"],
            "days": str(pkg["days"]),
        },
    )
    session = await stripe.create_checkout_session(req)

    txn = PaymentTransaction(
        user_id=user["user_id"],
        session_id=session.session_id,
        amount=float(pkg["amount"]),
        package_id=body.package_id,
        payment_status="initiated",
        metadata=req.metadata,
    )
    await db.payment_transactions.insert_one(txn.model_dump())
    return {"url": session.url, "session_id": session.session_id}


@api.get("/payments/status/{session_id}")
async def payments_status(session_id: str, request: Request):
    user = await require_user(request, db)
    txn = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    # Already finalized — do not double-apply.
    if txn["payment_status"] in ("paid", "expired", "failed"):
        return {"payment_status": txn["payment_status"], "status": txn["payment_status"]}

    host_url = str(request.base_url)
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url.rstrip('/')}/api/webhook/stripe")
    status = await stripe.get_checkout_status(session_id)

    new_status = status.payment_status  # "paid" | "unpaid" | "no_payment_required"
    session_state = status.status  # "open" | "complete" | "expired"

    final_status = txn["payment_status"]
    if new_status == "paid":
        final_status = "paid"
    elif session_state == "expired":
        final_status = "expired"

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": final_status, "updated_at": now_utc_iso()}},
    )

    if final_status == "paid":
        pkg = PACKAGES.get(txn["package_id"])
        if pkg:
            new_expiry = compute_new_expiry(user.get("plan_expires_at"), pkg["days"])
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "plan": pkg["plan"],
                    "plan_expires_at": new_expiry,
                    "generations_used_this_period": 0,
                    "period_start": now_utc_iso(),
                }},
            )
            await _log_event(user["user_id"], "upgrade", {"package": txn["package_id"]})

    return {"payment_status": final_status, "status": session_state}


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url.rstrip('/')}/api/webhook/stripe")
    try:
        evt = await stripe.handle_webhook(body, sig)
    except Exception as e:
        log.warning(f"webhook parse failed: {e}")
        return {"ok": False}
    if evt.event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        txn = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
        if txn and txn["payment_status"] != "paid" and evt.payment_status == "paid":
            pkg = PACKAGES.get(txn["package_id"])
            if pkg:
                user = await db.users.find_one({"user_id": txn["user_id"]}, {"_id": 0})
                new_expiry = compute_new_expiry(user.get("plan_expires_at") if user else None, pkg["days"])
                await db.users.update_one(
                    {"user_id": txn["user_id"]},
                    {"$set": {"plan": pkg["plan"], "plan_expires_at": new_expiry,
                              "generations_used_this_period": 0, "period_start": now_utc_iso()}},
                )
            await db.payment_transactions.update_one(
                {"session_id": evt.session_id},
                {"$set": {"payment_status": "paid", "updated_at": now_utc_iso()}},
            )
    return {"ok": True}


# =========================================================
# ANALYTICS
# =========================================================
async def _log_event(user_id: Optional[str], event_type: str, meta: dict):
    e = AnalyticsEvent(user_id=user_id, event_type=event_type, metadata=meta)
    await db.analytics_events.insert_one(e.model_dump())


@api.post("/analytics/event")
async def analytics_event(body: AnalyticsEventRequest, request: Request):
    user = await get_current_user_optional(request, db)
    await _log_event(user["user_id"] if user else None, body.event_type, body.metadata)
    return {"ok": True}


# =========================================================
# HEALTH
# =========================================================
@api.get("/")
async def root():
    return {"service": "ListingCraft API", "ok": True}


# --- CORS ---
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
