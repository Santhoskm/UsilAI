from fastapi import APIRouter, Depends, Query, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, desc, asc
from pydantic import BaseModel, Field
from typing import Optional, List
import time
import os
import hmac
import hashlib
import re

try:
    import psutil
except ImportError:
    psutil = None

from app.database import get_db, engine
from app.models.word import Word, UserWordFrequency
from app.state import trie_cache
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

START_TIME = time.time()


# ── Admin Token Generation & Verification ────────────────────────────────────

def create_admin_token(username: str) -> str:
    """Creates a time-stamped HMAC-SHA256 signed token for the admin session."""
    timestamp = str(int(time.time()))
    payload = f"{username}:{timestamp}"
    signature = hmac.new(
        settings.ADMIN_SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{payload}:{signature}"


def verify_admin_token(token: str) -> bool:
    """Validates token authenticity, signature, expiration, and username match."""
    if not token:
        return False
    # Allow master secret key directly (useful for tests or server scripts)
    if token == settings.ADMIN_SECRET_KEY:
        return True
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return False
        username, timestamp, signature = parts
        if username != settings.ADMIN_USERNAME:
            return False
        # Token valid for 7 days (604,800 seconds)
        if time.time() - int(timestamp) > 604800:
            return False
        expected_sig = hmac.new(
            settings.ADMIN_SECRET_KEY.encode(),
            f"{username}:{timestamp}".encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False


def persist_admin_credentials(new_user: str, new_pass: str):
    """Persists updated admin credentials into the .env file so changes survive restarts."""
    # Find .env file in root backend folder
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    if not os.path.exists(env_path):
        env_path = os.path.join(os.getcwd(), ".env")

    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read()

            if "ADMIN_USERNAME=" in content:
                content = re.sub(r"^ADMIN_USERNAME=.*$", f"ADMIN_USERNAME={new_user}", content, flags=re.MULTILINE)
            else:
                content += f"\nADMIN_USERNAME={new_user}\n"

            if "ADMIN_PASSWORD=" in content:
                content = re.sub(r"^ADMIN_PASSWORD=.*$", f"ADMIN_PASSWORD={new_pass}", content, flags=re.MULTILINE)
            else:
                content += f"\nADMIN_PASSWORD={new_pass}\n"

            with open(env_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"[Admin] Warning: could not persist credentials to .env: {e}")


async def get_current_admin(
    authorization: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None)
) -> str:
    """Dependency: enforces valid admin authentication token."""
    token = None
    if authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()
    elif x_admin_token:
        token = x_admin_token.strip()

    if not token or not verify_admin_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid Admin ID and password required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return settings.ADMIN_USERNAME


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AdminChangeCredentialsRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_username: Optional[str] = Field(None, min_length=2, max_length=50)
    new_password: str = Field(..., min_length=4, max_length=100)


class WordCreateRequest(BaseModel):
    tanglish: str = Field(..., min_length=1, max_length=100)
    tamil: str = Field(..., min_length=1)
    frequency: int = Field(default=100, ge=0)
    prefix: Optional[str] = None


class WordUpdateRequest(BaseModel):
    tanglish: Optional[str] = Field(None, min_length=1, max_length=100)
    tamil: Optional[str] = Field(None, min_length=1)
    frequency: Optional[int] = Field(None, ge=0)
    prefix: Optional[str] = None


class WordResponse(BaseModel):
    id: int
    tanglish: str
    tamil: str
    frequency: int
    prefix: str

    class Config:
        from_attributes = True


class WordListResponse(BaseModel):
    items: List[WordResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# ── 1. Admin Authentication Endpoints ─────────────────────────────────────────

@router.post("/auth/login")
async def admin_login(creds: AdminLoginRequest):
    """Authenticate with Admin ID and Password to obtain a session token."""
    user_input = creds.username.strip()
    pass_input = creds.password.strip()

    if user_input == settings.ADMIN_USERNAME and pass_input == settings.ADMIN_PASSWORD:
        token = create_admin_token(user_input)
        return {
            "success": True,
            "token": token,
            "username": user_input,
            "message": "Admin authentication successful"
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Admin ID or Password"
    )


@router.get("/auth/verify")
async def admin_verify(current_admin: str = Depends(get_current_admin)):
    """Verifies that the provided admin token is currently valid."""
    return {
        "valid": True,
        "username": current_admin
    }


@router.post("/auth/change-credentials")
async def change_credentials(
    req: AdminChangeCredentialsRequest,
    current_admin: str = Depends(get_current_admin)
):
    """Change Admin ID and Password for all admin pages and persist to .env."""
    if req.current_password.strip() != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    new_user = req.new_username.strip() if req.new_username else settings.ADMIN_USERNAME
    new_pass = req.new_password.strip()

    # Update in-memory configuration
    settings.ADMIN_USERNAME = new_user
    settings.ADMIN_PASSWORD = new_pass

    # Persist to .env file
    persist_admin_credentials(new_user, new_pass)

    new_token = create_admin_token(new_user)
    return {
        "success": True,
        "message": "Admin ID and Password updated successfully",
        "username": new_user,
        "token": new_token
    }


# ── 2. Dictionary & Word Management Endpoints (Protected) ─────────────────────

@router.get("/words", response_model=WordListResponse)
async def list_words(
    search: str = Query("", description="Search by tanglish or tamil word"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("frequency", description="Sort field: frequency, tanglish, or id"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """List and search dictionary words with pagination and sorting."""
    offset = (page - 1) * limit

    query = select(Word)
    count_query = select(func.count(Word.id))

    if search.strip():
        search_term = f"%{search.strip().lower()}%"
        filter_clause = (func.lower(Word.tanglish).like(search_term)) | (Word.tamil.like(f"%{search.strip()}%"))
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    sort_column = Word.frequency
    if sort_by == "tanglish":
        sort_column = Word.tanglish
    elif sort_by == "id":
        sort_column = Word.id

    query = query.order_by(desc(sort_column) if order.lower() == "desc" else asc(sort_column))
    query = query.offset(offset).limit(limit)

    try:
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0

        words_result = await db.execute(query)
        items = words_result.scalars().all()
    except Exception:
        total = 0
        items = []

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return WordListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.post("/words", response_model=WordResponse, status_code=status.HTTP_201_CREATED)
async def create_word(
    word_in: WordCreateRequest,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Add a new word to the dictionary and immediately update the in-memory Trie."""
    tanglish_clean = word_in.tanglish.strip().lower()
    tamil_clean = word_in.tamil.strip()
    prefix = word_in.prefix.strip().lower() if word_in.prefix else tanglish_clean[:2]

    existing_result = await db.execute(
        select(Word).where(func.lower(Word.tanglish) == tanglish_clean)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.tamil = tamil_clean
        existing.frequency = word_in.frequency
        existing.prefix = prefix
        await db.commit()
        await db.refresh(existing)
        target_word = existing
    else:
        new_word = Word(
            tanglish=tanglish_clean,
            tamil=tamil_clean,
            frequency=word_in.frequency,
            prefix=prefix
        )
        db.add(new_word)
        await db.commit()
        await db.refresh(new_word)
        target_word = new_word

    trie_cache.insert(target_word.tanglish, target_word.tamil, target_word.frequency)
    return target_word


@router.put("/words/{word_id}", response_model=WordResponse)
async def update_word(
    word_id: int,
    word_in: WordUpdateRequest,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing word and update the in-memory Trie."""
    word_obj = await db.get(Word, word_id)
    if not word_obj:
        raise HTTPException(status_code=404, detail="Word not found")

    old_tanglish = word_obj.tanglish

    if word_in.tanglish is not None:
        word_obj.tanglish = word_in.tanglish.strip().lower()
        word_obj.prefix = word_obj.tanglish[:2]
    if word_in.tamil is not None:
        word_obj.tamil = word_in.tamil.strip()
    if word_in.frequency is not None:
        word_obj.frequency = word_in.frequency
    if word_in.prefix is not None:
        word_obj.prefix = word_in.prefix.strip().lower()

    await db.commit()
    await db.refresh(word_obj)

    if old_tanglish != word_obj.tanglish:
        trie_cache.delete(old_tanglish)

    trie_cache.insert(word_obj.tanglish, word_obj.tamil, word_obj.frequency)
    return word_obj


@router.delete("/words/{word_id}")
async def delete_word(
    word_id: int,
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a word from PostgreSQL and remove it from the in-memory Trie."""
    word_obj = await db.get(Word, word_id)
    if not word_obj:
        raise HTTPException(status_code=404, detail="Word not found")

    tanglish_to_delete = word_obj.tanglish

    await db.delete(word_obj)
    await db.commit()

    trie_cache.delete(tanglish_to_delete)
    return {"message": f"Word '{tanglish_to_delete}' deleted successfully", "id": word_id}


# ── 3. System Status & In-Memory Trie Management (Protected) ───────────────────

@router.get("/status")
async def get_system_status(
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """System health, live stats, in-memory Trie size, and server info."""
    db_connected = False
    db_word_count = 0

    try:
        count_res = await db.execute(select(func.count(Word.id)))
        db_word_count = count_res.scalar_one_or_none() or 0
        db_connected = True
    except Exception:
        db_connected = False

    reranker_status = "unloaded"
    try:
        from app.api.v1.rerank import _reranker
        if _reranker is not None:
            reranker_status = "ready"
        else:
            reranker_status = "idle"
    except Exception:
        reranker_status = "unavailable"

    memory_info = {}
    try:
        if psutil:
            proc = psutil.Process(os.getpid())
            mem = proc.memory_info()
            memory_info = {
                "rss_mb": round(mem.rss / (1024 * 1024), 2),
                "vms_mb": round(mem.vms / (1024 * 1024), 2),
                "cpu_percent": proc.cpu_percent(interval=None)
            }
        else:
            memory_info = {"rss_mb": "N/A", "cpu_percent": "N/A"}
    except Exception:
        memory_info = {"rss_mb": "N/A", "cpu_percent": "N/A"}

    uptime_seconds = int(time.time() - START_TIME)

    return {
        "status": "healthy" if db_connected else "degraded",
        "admin_user": current_admin,
        "database": {
            "connected": db_connected,
            "total_words": db_word_count,
        },
        "trie_cache": {
            "in_memory_words": trie_cache.size,
            "synced_with_db": (trie_cache.size >= db_word_count and db_word_count > 0)
        },
        "reranker": {
            "model": "model_dynamic.onnx",
            "status": reranker_status
        },
        "system": {
            "uptime_seconds": uptime_seconds,
            "memory": memory_info,
            "pid": os.getpid()
        }
    }


@router.post("/trie/reload")
async def reload_trie(
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Triggers an in-memory Trie reload from the PostgreSQL database."""
    try:
        result = await db.execute(
            text("SELECT tanglish, tamil, frequency FROM words")
        )
        rows = result.fetchall()

        trie_cache.clear()
        for row in rows:
            trie_cache.insert(row[0], row[1], row[2] or 0)

        return {
            "success": True,
            "message": f"Successfully reloaded {trie_cache.size} words into Trie cache",
            "loaded_words": trie_cache.size
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reload Trie cache: {str(e)}"
        )


# ── 4. Word Usage Analytics Endpoints (Protected) ─────────────────────────────

@router.get("/analytics")
async def get_word_analytics(
    current_admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Word usage statistics, top words by frequency, and user frequency logs."""
    top_words = []
    total_words = 0
    user_freq_count = 0
    top_user_words = []
    high_count = 0
    med_count = 0
    low_count = 0

    try:
        top_words_res = await db.execute(
            select(Word.tanglish, Word.tamil, Word.frequency)
            .order_by(desc(Word.frequency))
            .limit(15)
        )
        top_words = [
            {"tanglish": r[0], "tamil": r[1], "frequency": r[2]}
            for r in top_words_res.fetchall()
        ]

        total_words_res = await db.execute(select(func.count(Word.id)))
        total_words = total_words_res.scalar_one_or_none() or 0

        user_freq_count_res = await db.execute(select(func.count(UserWordFrequency.id)))
        user_freq_count = user_freq_count_res.scalar_one_or_none() or 0

        top_user_freq_res = await db.execute(
            select(Word.tanglish, Word.tamil, UserWordFrequency.usage_count, UserWordFrequency.user_id)
            .join(Word, UserWordFrequency.word_id == Word.id)
            .order_by(desc(UserWordFrequency.usage_count))
            .limit(10)
        )
        top_user_words = [
            {
                "tanglish": r[0],
                "tamil": r[1],
                "usage_count": r[2],
                "user_id": r[3]
            }
            for r in top_user_freq_res.fetchall()
        ]

        high_freq_res = await db.execute(select(func.count(Word.id)).where(Word.frequency >= 10000))
        med_freq_res = await db.execute(select(func.count(Word.id)).where((Word.frequency >= 1000) & (Word.frequency < 10000)))
        low_freq_res = await db.execute(select(func.count(Word.id)).where(Word.frequency < 1000))

        high_count = high_freq_res.scalar_one_or_none() or 0
        med_count = med_freq_res.scalar_one_or_none() or 0
        low_count = low_freq_res.scalar_one_or_none() or 0
    except Exception:
        pass

    return {
        "summary": {
            "total_dictionary_words": total_words,
            "total_user_tracked_words": user_freq_count,
            "in_memory_trie_size": trie_cache.size
        },
        "top_frequent_words": top_words,
        "top_user_adaptive_words": top_user_words,
        "distribution": {
            "high_frequency": high_count,
            "medium_frequency": med_count,
            "low_frequency": low_count
        }
    }
