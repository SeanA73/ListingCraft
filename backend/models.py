"""Pydantic models for ListingCraft."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import uuid


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}" if prefix else uuid.uuid4().hex


# ---------- USER ----------
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    password_hash: Optional[str] = None  # None for Google users
    auth_provider: str = "email"  # "email" or "google"
    plan: str = "free"  # free, starter, pro
    plan_expires_at: Optional[str] = None  # ISO datetime; None = never
    generations_used_this_period: int = 0
    period_start: str = Field(default_factory=now_utc_iso)
    stripe_customer_id: Optional[str] = None
    created_at: str = Field(default_factory=now_utc_iso)


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    plan: str
    plan_expires_at: Optional[str] = None
    generations_used_this_period: int
    period_start: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


# ---------- LISTING ----------
class GenerateRequest(BaseModel):
    product_description: str = Field(default="", max_length=4000)
    image_base64: Optional[str] = None  # data:image/... or raw base64
    image_mime: Optional[str] = None  # image/jpeg, image/png, image/webp
    category: Optional[str] = None
    price_point: Optional[str] = None
    target_buyer: Optional[str] = None
    tone: str = "warm"  # warm, professional, playful, luxury


class RegenerateFieldRequest(BaseModel):
    field: str  # title, tags, description, attributes, alt_text, keywords
    tone: Optional[str] = None
    length: Optional[str] = None  # shorter, longer


class GeneratedListing(BaseModel):
    title: str = ""
    tags: List[str] = Field(default_factory=list)
    description: str = ""
    attributes: Dict[str, str] = Field(default_factory=dict)
    alt_text: List[str] = Field(default_factory=list)
    keywords: List[Dict[str, Any]] = Field(default_factory=list)  # [{phrase, relevance}]


class ListingScore(BaseModel):
    total: int = 0
    checks: List[Dict[str, Any]] = Field(default_factory=list)


class Listing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    listing_id: str = Field(default_factory=lambda: f"lst_{uuid.uuid4().hex[:16]}")
    user_id: str
    input: Dict[str, Any] = Field(default_factory=dict)  # snapshot of request
    generated: GeneratedListing = Field(default_factory=GeneratedListing)
    score: ListingScore = Field(default_factory=ListingScore)
    tone: str = "warm"
    created_at: str = Field(default_factory=now_utc_iso)
    updated_at: str = Field(default_factory=now_utc_iso)


class ListingUpdateRequest(BaseModel):
    generated: Optional[GeneratedListing] = None


class BulkGenerateRequest(BaseModel):
    products: List[GenerateRequest]


# ---------- PAYMENTS ----------
class CheckoutRequest(BaseModel):
    package_id: str  # starter_monthly, starter_annual, pro_monthly, pro_annual
    origin_url: str


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    txn_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:16]}")
    user_id: str
    session_id: str
    amount: float
    currency: str = "usd"
    package_id: str
    payment_status: str = "initiated"  # initiated, paid, expired, failed
    metadata: Dict[str, str] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_utc_iso)
    updated_at: str = Field(default_factory=now_utc_iso)


# ---------- ANALYTICS ----------
class AnalyticsEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    event_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_utc_iso)


class AnalyticsEventRequest(BaseModel):
    event_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
