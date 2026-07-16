"""Authentication: JWT email/password + Emergent Google OAuth session."""
import os
import uuid
import bcrypt
import jwt
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import User, UserPublic

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGO = "HS256"
JWT_TTL_DAYS = 7

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, pw_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), pw_hash.encode("utf-8"))
    except Exception:
        return False


def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return None


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="session_token",
        value=token,
        max_age=JWT_TTL_DAYS * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)


async def fetch_google_session(session_id: str) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            r = await client.get(
                EMERGENT_SESSION_URL,
                headers={"X-Session-ID": session_id},
            )
            if r.status_code != 200:
                return None
            return r.json()
        except Exception:
            return None


def _read_token(request: Request) -> Optional[str]:
    tok = request.cookies.get("session_token")
    if tok:
        return tok
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def _load_user_by_session_token(db: AsyncIOMotorDatabase, token: str) -> Optional[dict]:
    """Emergent Google flow: token is stored in user_sessions collection."""
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    return user


async def get_current_user_optional(request: Request, db: AsyncIOMotorDatabase) -> Optional[dict]:
    token = _read_token(request)
    if not token:
        return None
    # 1) JWT (email/password)
    payload = decode_jwt(token)
    if payload and payload.get("user_id"):
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user
    # 2) Emergent session_token
    return await _load_user_by_session_token(db, token)


async def require_user(request: Request, db: AsyncIOMotorDatabase) -> dict:
    user = await get_current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def to_public(user: dict) -> UserPublic:
    return UserPublic(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name", ""),
        picture=user.get("picture"),
        plan=user.get("plan", "free"),
        plan_expires_at=user.get("plan_expires_at"),
        generations_used_this_period=user.get("generations_used_this_period", 0),
        period_start=user.get("period_start", datetime.now(timezone.utc).isoformat()),
    )
