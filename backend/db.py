"""Shared Supabase client (service-role, server-side only).

All database access goes through the single client returned by get_db(). It is
created with the SERVICE ROLE key, which BYPASSES row level security — so this
module must only ever run on the backend. Never ship this key to the frontend.
"""
import os
from supabase import create_client, Client

_supabase: Client | None = None


def _require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        raise RuntimeError(
            f"Missing required environment variable {name}. "
            "ListingCraft needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "to be set (see backend/.env.example). Refusing to start."
        )
    return val


def get_db() -> Client:
    """Return the process-wide Supabase client, created on first use.

    Raises a clear RuntimeError at startup if the required env vars are missing,
    rather than failing deep inside a request handler.
    """
    global _supabase
    if _supabase is None:
        url = _require_env("SUPABASE_URL")
        key = _require_env("SUPABASE_SERVICE_ROLE_KEY")
        _supabase = create_client(url, key)
    return _supabase


def one(res):
    """Return the first row of a PostgREST response, or None if empty."""
    data = getattr(res, "data", None)
    return data[0] if data else None
