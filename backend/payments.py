"""Stripe checkout + package definitions for ListingCraft subscriptions.

We use one-time Checkout sessions with fixed monthly/annual prices. Each successful
payment extends the user's `plan_expires_at` by 30 or 365 days. When the date passes
the user downgrades to free. This keeps the flow simple and works with the
emergentintegrations Stripe helper (which does not create recurring subscriptions).
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Dict

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

# Fixed, server-side-only packages. Never trust the frontend.
PACKAGES: Dict[str, dict] = {
    "starter_monthly": {"amount": 9.00, "plan": "starter", "days": 30, "label": "Starter — Monthly"},
    "starter_annual":  {"amount": 90.00, "plan": "starter", "days": 365, "label": "Starter — Annual (2 months free)"},
    "pro_monthly":     {"amount": 19.00, "plan": "pro",     "days": 30, "label": "Pro — Monthly"},
    "pro_annual":      {"amount": 190.00, "plan": "pro",    "days": 365, "label": "Pro — Annual (2 months free)"},
}

PLAN_LIMITS = {
    "free":    {"monthly_generations": 3,   "library_cap": 5,    "bulk": False, "csv": False},
    "starter": {"monthly_generations": 50,  "library_cap": None, "bulk": False, "csv": False},
    "pro":     {"monthly_generations": None,"library_cap": None, "bulk": True,  "csv": True},
}


def effective_plan(user: dict) -> str:
    """Return current effective plan, downgrading if expired."""
    plan = user.get("plan", "free")
    if plan == "free":
        return "free"
    exp = user.get("plan_expires_at")
    if not exp:
        return "free"
    try:
        exp_dt = datetime.fromisoformat(exp)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    except Exception:
        return "free"
    if exp_dt < datetime.now(timezone.utc):
        return "free"
    return plan


def compute_new_expiry(current_expiry: str | None, days: int) -> str:
    """Extend from now, or from current expiry if still in the future."""
    now = datetime.now(timezone.utc)
    base = now
    if current_expiry:
        try:
            cur = datetime.fromisoformat(current_expiry)
            if cur.tzinfo is None:
                cur = cur.replace(tzinfo=timezone.utc)
            if cur > now:
                base = cur
        except Exception:
            pass
    return (base + timedelta(days=days)).isoformat()
