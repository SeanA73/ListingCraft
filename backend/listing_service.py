"""AI listing generation via Emergent LLM (Claude Sonnet 4.5) with vision."""
import os
import json
import re
import base64
import tempfile
from typing import Optional
from emergentintegrations.llm.chat import (
    LlmChat,
    UserMessage,
    FileContentWithMimeType,
    ImageContent,
)

from prompts import (
    SYSTEM_PROMPT,
    IMAGE_ANALYSIS_PROMPT,
    build_generation_prompt,
    build_field_regen_prompt,
)
from models import GeneratedListing, ListingScore

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5-20250929"


def _new_chat(session_id: str, system: str = SYSTEM_PROMPT) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


def _extract_json(text: str) -> dict:
    """Robustly pull the first JSON object out of an LLM response."""
    text = text.strip()
    # strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        pass
    # find first { .. last }
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        candidate = text[start : end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            pass
    raise ValueError("LLM did not return valid JSON")


def _b64_to_tempfile(image_base64: str, mime: str) -> str:
    if "," in image_base64 and image_base64.strip().startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(mime, ".jpg")
    fd, path = tempfile.mkstemp(suffix=ext)
    with os.fdopen(fd, "wb") as f:
        f.write(base64.b64decode(image_base64))
    return path


async def analyze_image(image_base64: str, mime: str) -> str:
    """Return a short plain-text visual summary of the product photo."""
    path = _b64_to_tempfile(image_base64, mime)
    try:
        chat = _new_chat(session_id=f"img-{os.path.basename(path)}", system=IMAGE_ANALYSIS_PROMPT)
        img = FileContentWithMimeType(file_path=path, mime_type=mime or "image/jpeg")
        msg = UserMessage(text="Describe this product photo per the rules.", file_contents=[img])
        text = await chat.send_message(msg)
        return (text or "").strip()
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


async def generate_listing(
    product_description: str,
    image_base64: Optional[str],
    image_mime: Optional[str],
    category: Optional[str],
    price_point: Optional[str],
    target_buyer: Optional[str],
    tone: str,
    session_id: str,
) -> GeneratedListing:
    image_summary = None
    if image_base64 and image_mime:
        try:
            image_summary = await analyze_image(image_base64, image_mime)
        except Exception as e:
            image_summary = None

    prompt = build_generation_prompt(
        product_description=product_description,
        category=category,
        price_point=price_point,
        target_buyer=target_buyer,
        tone=tone,
        image_summary=image_summary,
    )
    chat = _new_chat(session_id=session_id)
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw)

    # Coerce shapes
    tags = data.get("tags") or []
    if not isinstance(tags, list):
        tags = []
    tags = [str(t).strip() for t in tags if str(t).strip()]
    # enforce 13-tag & 20-char limits (truncate over-long, avoid duplicates)
    seen = set()
    clean_tags = []
    for t in tags:
        t = t[:20].strip().lower()
        if t and t not in seen:
            seen.add(t)
            clean_tags.append(t)
        if len(clean_tags) == 13:
            break

    alt_text = data.get("alt_text") or []
    if not isinstance(alt_text, list):
        alt_text = []
    alt_text = [str(a).strip() for a in alt_text if str(a).strip()][:10]

    keywords_raw = data.get("keywords") or []
    keywords = []
    if isinstance(keywords_raw, list):
        for k in keywords_raw:
            if isinstance(k, dict) and k.get("phrase"):
                try:
                    rel = int(k.get("relevance", 50))
                except Exception:
                    rel = 50
                keywords.append({"phrase": str(k["phrase"]).strip(), "relevance": max(0, min(100, rel))})
            elif isinstance(k, str):
                keywords.append({"phrase": k.strip(), "relevance": 60})
    keywords = keywords[:20]

    attrs = data.get("attributes") or {}
    if not isinstance(attrs, dict):
        attrs = {}
    attributes = {k: str(v) for k, v in attrs.items() if isinstance(k, str)}

    title = str(data.get("title", "")).strip()[:140]
    description = str(data.get("description", "")).strip()

    return GeneratedListing(
        title=title,
        tags=clean_tags,
        description=description,
        attributes=attributes,
        alt_text=alt_text,
        keywords=keywords,
    )


async def regenerate_field(
    field: str,
    listing_input: dict,
    current_generated: dict,
    tone: str,
    length: Optional[str],
    session_id: str,
) -> dict:
    prompt = build_field_regen_prompt(
        field=field,
        listing_input=listing_input,
        current_generated=current_generated,
        tone=tone,
        length=length,
    )
    chat = _new_chat(session_id=session_id)
    raw = await chat.send_message(UserMessage(text=prompt))
    return _extract_json(raw)


# ---------- Listing Score ----------
def compute_score(gen: GeneratedListing) -> ListingScore:
    checks = []
    total = 0

    # Title length used (target 100-140)
    tlen = len(gen.title or "")
    title_ok = 100 <= tlen <= 140
    checks.append({
        "label": "Title length uses ≥100 of 140 characters",
        "passed": title_ok,
        "detail": f"{tlen}/140 chars",
        "weight": 15,
    })
    if title_ok:
        total += 15
    elif tlen > 60:
        total += 8

    # 13 tags filled
    n_tags = len(gen.tags or [])
    tags_ok = n_tags == 13
    checks.append({
        "label": "All 13 tags used",
        "passed": tags_ok,
        "detail": f"{n_tags}/13",
        "weight": 20,
    })
    if tags_ok:
        total += 20
    else:
        total += int(20 * (n_tags / 13))

    # Tag char usage (avg > 12 chars)
    avg_tag_chars = (sum(len(t) for t in gen.tags) / max(1, n_tags)) if n_tags else 0
    tagchars_ok = avg_tag_chars >= 12
    checks.append({
        "label": "Tags use character space well (avg ≥ 12 chars)",
        "passed": tagchars_ok,
        "detail": f"avg {avg_tag_chars:.1f} chars",
        "weight": 10,
    })
    if tagchars_ok:
        total += 10
    elif avg_tag_chars >= 8:
        total += 6

    # Keyword overlap: does the primary keyword phrase (title first 40 chars) share words with tags?
    title_head = (gen.title or "")[:40].lower()
    head_words = set(re.findall(r"[a-z0-9]+", title_head))
    tag_words = set()
    for t in gen.tags:
        tag_words.update(re.findall(r"[a-z0-9]+", t.lower()))
    overlap = len(head_words & tag_words)
    overlap_ok = overlap >= 3
    checks.append({
        "label": "Title front-loaded keywords appear in tags",
        "passed": overlap_ok,
        "detail": f"{overlap} shared keywords",
        "weight": 15,
    })
    if overlap_ok:
        total += 15
    elif overlap >= 1:
        total += 8

    # Description length (target 400+ chars)
    dlen = len(gen.description or "")
    desc_ok = dlen >= 400
    checks.append({
        "label": "Description is buyer-rich (≥ 400 chars)",
        "passed": desc_ok,
        "detail": f"{dlen} chars",
        "weight": 15,
    })
    if desc_ok:
        total += 15
    elif dlen >= 200:
        total += 8

    # First 160 chars of description quality (contain title's primary keyword)
    first_160 = (gen.description or "")[:160].lower()
    snippet_ok = len(first_160) >= 100 and any(w in first_160 for w in head_words if len(w) > 3)
    checks.append({
        "label": "First 160 chars are search-snippet ready",
        "passed": snippet_ok,
        "detail": "Google snippet zone" if snippet_ok else "Needs primary keyword up top",
        "weight": 15,
    })
    if snippet_ok:
        total += 15

    # Alt text coverage
    alt_ok = len(gen.alt_text or []) >= 5
    checks.append({
        "label": "Alt text ready for 5+ photos",
        "passed": alt_ok,
        "detail": f"{len(gen.alt_text)}/10",
        "weight": 10,
    })
    if alt_ok:
        total += 10
    elif len(gen.alt_text) >= 1:
        total += 5

    return ListingScore(total=min(100, total), checks=checks)
