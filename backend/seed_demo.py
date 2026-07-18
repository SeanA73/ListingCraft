"""Seed a demo account with 3 example listings, so the UI never looks empty.

Idempotent: safe to run repeatedly. The demo user is upserted by email, and the
example listings are only inserted if the demo user has none yet.
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv(Path(__file__).parent / ".env")

from db import get_db, one  # noqa
from models import User, Listing, GeneratedListing, ListingScore  # noqa
from auth import hash_password  # noqa
from listing_service import compute_score  # noqa


DEMO_EMAIL = "demo@listingcraft.app"
DEMO_PASSWORD = "demo1234"


EXAMPLES = [
    {
        "input": {
            "product_description": "Ocean sunset painting, acrylic on canvas 16x20 inches, warm oranges and deep teal, coastal wall art",
            "category": "Wall Art",
            "target_buyer": "coastal home decor",
            "tone": "warm",
        },
        "generated": {
            "title": "Ocean Sunset Painting | Original Acrylic Coastal Wall Art | 16x20 Warm Beach House Decor Gift",
            "tags": [
                "ocean sunset art", "coastal wall art", "acrylic painting", "beach house decor",
                "original painting", "sunset wall decor", "living room art", "16x20 canvas art",
                "warm coastal decor", "housewarming gift", "teal orange art", "seascape painting",
                "handpainted canvas",
            ],
            "description": "Ocean sunset painting in warm terracotta and deep teal — an original 16x20 acrylic canvas made for coastal homes and quiet evenings.\n\nThis piece pulls the last light of the day across the water: the kind of sunset you catch out of the corner of your eye and slow down for. It layers thick, buttery acrylic strokes with a soft glaze so the colors shift a little as the light in the room changes.\n\nSpecs:\n• Size: 16 x 20 inches\n• Medium: Acrylic on stretched canvas\n• Sides: [FINISHED_SIDES]\n• Ready to hang: [YES/NO]\n• Framing: [FRAMED/UNFRAMED]\n• Care: Dust gently with a dry, soft cloth\n• Shipping: [SHIPPING_TIME]\n\nOne of a kind — once it sells, it's gone. Message me for a custom size or a matching second piece for a gallery wall.",
            "attributes": {"occasion": "housewarming", "style": "coastal", "room": "living room", "recipient": "home owner", "primary_color": "teal"},
            "alt_text": [
                "Ocean sunset acrylic painting on 16x20 canvas in warm orange and deep teal",
                "Close-up of thick acrylic brushstrokes on ocean sunset canvas art",
                "Ocean sunset painting styled above a linen sofa in coastal living room",
                "Corner detail of stretched canvas showing painted sides",
                "Ocean sunset painting held next to a window for scale",
            ],
            "keywords": [
                {"phrase": "ocean sunset painting", "relevance": 96},
                {"phrase": "coastal wall art canvas", "relevance": 92},
                {"phrase": "acrylic seascape 16x20", "relevance": 90},
                {"phrase": "warm teal orange art", "relevance": 84},
                {"phrase": "beach house decor gift", "relevance": 82},
                {"phrase": "original sunset canvas", "relevance": 88},
                {"phrase": "living room coastal art", "relevance": 80},
                {"phrase": "housewarming coastal gift", "relevance": 78},
                {"phrase": "modern seascape painting", "relevance": 77},
                {"phrase": "sunset over water art", "relevance": 85},
                {"phrase": "teal and rust wall art", "relevance": 72},
                {"phrase": "handpainted canvas 16x20", "relevance": 74},
                {"phrase": "coastal gallery wall art", "relevance": 71},
                {"phrase": "warm beach sunset print", "relevance": 68},
                {"phrase": "orange sunset canvas art", "relevance": 79},
                {"phrase": "coastal cottage wall decor", "relevance": 73},
            ],
        },
    },
    {
        "input": {
            "product_description": "Hand-crocheted amigurumi bunny plush, soft cream cotton, 8 inches tall, baby-safe stuffing",
            "category": "Toys",
            "target_buyer": "baby shower gift",
            "tone": "warm",
        },
        "generated": {
            "title": "Crochet Bunny Plush | Amigurumi Baby Shower Gift | Cream Cotton Nursery Toy | 8 Inch Soft Rabbit",
            "tags": [
                "crochet bunny", "amigurumi bunny", "baby shower gift", "nursery decor toy",
                "cotton plush toy", "handmade bunny", "cream rabbit plush", "new baby gift",
                "soft baby toy", "gift for newborn", "amigurumi rabbit", "crochet nursery toy",
                "heirloom baby toy",
            ],
            "description": "Crochet bunny plush in soft cream cotton — a keepsake amigurumi rabbit built to survive a lot of love. About 8 inches tall, made stitch by stitch for a baby shower or a first birthday.\n\nEvery detail is worked by hand: the tiny embroidered nose, the round belly that sits nicely on a shelf, and the ears that flop just enough. Baby-safe stuffing throughout, no plastic eyes.\n\nSpecs:\n• Height: 8 inches (approx.)\n• Fiber: 100% cotton yarn\n• Fill: Polyester fiberfill (baby-safe)\n• Safety features: Embroidered face, no small parts\n• Care: [CARE_INSTRUCTIONS]\n• Made to order: [YES/NO — LEAD_TIME]\n\nWant a different color, a matching sibling bunny, or a name embroidered on the ear? Just message me — I love a custom order.",
            "attributes": {"occasion": "baby shower", "style": "cottagecore", "room": "nursery", "recipient": "baby", "primary_color": "cream"},
            "alt_text": [
                "Cream crochet bunny amigurumi plush toy 8 inches tall",
                "Crochet bunny plush sitting on nursery shelf next to books",
                "Close-up of hand embroidered face on cream amigurumi rabbit",
                "Crochet bunny held in adult hands for size reference",
                "Cream crochet bunny plush wrapped in ribbon as a baby shower gift",
            ],
            "keywords": [
                {"phrase": "crochet bunny plush", "relevance": 95},
                {"phrase": "amigurumi bunny toy", "relevance": 93},
                {"phrase": "cream nursery bunny", "relevance": 84},
                {"phrase": "baby shower crochet gift", "relevance": 90},
                {"phrase": "handmade bunny plush", "relevance": 86},
                {"phrase": "cotton amigurumi rabbit", "relevance": 82},
                {"phrase": "soft nursery toy", "relevance": 76},
                {"phrase": "heirloom baby toy", "relevance": 78},
                {"phrase": "newborn keepsake gift", "relevance": 80},
                {"phrase": "8 inch crochet rabbit", "relevance": 72},
                {"phrase": "cream cotton plush", "relevance": 71},
                {"phrase": "gender neutral baby gift", "relevance": 74},
                {"phrase": "safe crochet toy", "relevance": 70},
                {"phrase": "nursery shelf decor", "relevance": 68},
                {"phrase": "cottagecore nursery toy", "relevance": 69},
            ],
        },
    },
    {
        "input": {
            "product_description": "Minimalist leather journal, refillable A5, natural vegetable tanned leather, hand-stitched spine",
            "category": "Journals",
            "target_buyer": "gift for writer",
            "tone": "luxury",
        },
        "generated": {
            "title": "Leather Journal Refillable A5 | Minimalist Natural Vegetable Tanned Notebook | Writer Gift Handstitched",
            "tags": [
                "leather journal", "refillable journal", "a5 leather notebook", "minimalist journal",
                "gift for writer", "vegetable tanned", "handstitched journal", "natural leather book",
                "travel journal", "personalized gift", "leather notebook a5", "writer gift idea",
                "everyday carry gift",
            ],
            "description": "A refillable A5 leather journal in natural vegetable-tanned hide, hand-stitched down the spine. Built to age — the leather softens, darkens, and picks up the character of the hand that carries it.\n\nWe kept the details deliberate: no logos, no clasps, no filler. Just a single strap, a clean edge, and paper you'll actually want to write on. Refill inserts drop in from either end, so a full journal never has to leave the cover.\n\nSpecs:\n• Size: A5 (approx. 5.8 x 8.3 in)\n• Cover: Full-grain vegetable-tanned leather\n• Spine: Hand-stitched, saddle-stitched linen thread\n• Refills: [INSERT_TYPE] — sold separately\n• Personalization: [MONOGRAM_OPTIONS]\n• Care: Wipe with a dry cloth. Leather conditioner every 6-12 months.\n\nA quiet gift for a writer, a designer, or anyone who still keeps notes by hand. Add a monogram at checkout, or message me for a matching pen loop.",
            "attributes": {"occasion": "graduation", "style": "minimalist", "room": "office", "recipient": "writer", "primary_color": "natural tan"},
            "alt_text": [
                "Minimalist natural leather A5 refillable journal with hand-stitched spine",
                "Close-up of hand-stitched saddle stitch spine on vegetable tanned leather journal",
                "Leather A5 journal lying open on a linen surface with fountain pen",
                "Top view of natural tan leather journal cover showing grain",
                "Leather journal held in hands showing scale and softness",
            ],
            "keywords": [
                {"phrase": "leather journal a5 refillable", "relevance": 96},
                {"phrase": "vegetable tanned notebook", "relevance": 90},
                {"phrase": "minimalist leather journal", "relevance": 92},
                {"phrase": "handstitched writing journal", "relevance": 84},
                {"phrase": "gift for writer", "relevance": 88},
                {"phrase": "natural leather notebook", "relevance": 82},
                {"phrase": "refillable a5 notebook", "relevance": 80},
                {"phrase": "everyday carry journal", "relevance": 76},
                {"phrase": "personalized leather gift", "relevance": 82},
                {"phrase": "writer graduation gift", "relevance": 78},
                {"phrase": "monogram leather journal", "relevance": 75},
                {"phrase": "artisan leather notebook", "relevance": 72},
                {"phrase": "minimal notebook cover", "relevance": 70},
                {"phrase": "travel writing journal", "relevance": 74},
                {"phrase": "designer leather journal", "relevance": 71},
                {"phrase": "hand stitched leather book", "relevance": 79},
            ],
        },
    },
]


def main():
    db = get_db()

    existing = one(db.table("users").select("*").eq("email", DEMO_EMAIL).limit(1).execute())
    if existing:
        user_id = existing["user_id"]
        db.table("users").update({
            "password_hash": hash_password(DEMO_PASSWORD),
            "plan": "pro",
            "plan_expires_at": datetime(2099, 1, 1, tzinfo=timezone.utc).isoformat(),
            "generations_used_this_period": 0,
        }).eq("user_id", user_id).execute()
        print(f"[seed] Reusing user {user_id}")
    else:
        u = User(
            email=DEMO_EMAIL,
            name="Demo Maker",
            password_hash=hash_password(DEMO_PASSWORD),
            auth_provider="email",
            plan="pro",
            plan_expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc).isoformat(),
        )
        db.table("users").insert(u.model_dump()).execute()
        user_id = u.user_id
        print(f"[seed] Created user {user_id}")

    # Idempotent: only seed example listings if this user has none yet.
    n = db.table("listings").select("listing_id", count="exact").eq(
        "user_id", user_id
    ).execute().count or 0
    if n > 0:
        print(f"[seed] User already has {n} listing(s); skipping listing seed.")
        return

    for ex in EXAMPLES:
        gen = GeneratedListing(**ex["generated"])
        score = compute_score(gen)
        listing = Listing(
            user_id=user_id,
            input=ex["input"],
            generated=gen,
            score=score,
            tone=ex["input"].get("tone", "warm"),
        )
        db.table("listings").insert(listing.model_dump()).execute()
    print(f"[seed] Inserted {len(EXAMPLES)} example listings.")


if __name__ == "__main__":
    main()
