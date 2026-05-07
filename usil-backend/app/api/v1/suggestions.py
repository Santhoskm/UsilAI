# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Query
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import text
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional
from app.database import get_db, engine
from app.services.suggestion_service import SuggestionService

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.get("/health")
async def suggestions_health():
    """Proxied health check — usable via Vite /api/usil/suggestions/health"""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected", "service": "suggestions"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get("/")
async def get_suggestions(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of suggestions"),
    fuzzy: bool = Query(False, description="Enable fuzzy search"),
    db: AsyncSession = Depends(get_db)
):
    """Get typing suggestions from usil_db"""
    service = SuggestionService(db)

    if fuzzy:
        suggestions = await service.get_fuzzy_suggestions(q, limit)
    else:
        suggestions = await service.get_suggestions(q, limit)

    return {
        "query": q,
        "suggestions": suggestions,
        "count": len(suggestions)
    }


@router.get("/dictionary")
async def get_full_dictionary(db: AsyncSession = Depends(get_db)):
    """
    Returns ALL words as a {tanglish: {tamil, frequency}} JSON object.
    The frontend loads this once at startup to build its in-memory engine.
    Cached with a long max-age so it's only fetched once per session.
    """
    result = await db.execute(
        text("SELECT tanglish, tamil, frequency FROM words ORDER BY tanglish")
    )
    rows = result.fetchall()

    # Build {tanglish: {t: tamil, f: frequency}} — compact keys to save bandwidth
    dictionary = {
        row[0]: {"t": row[1], "f": row[2] or 0}
        for row in rows
    }

    response = JSONResponse(content=dictionary)
    # Cache for 1 hour — dictionary rarely changes
    response.headers["Cache-Control"] = "public, max-age=3600"
    return response


# ── Frequency tracking ───────────────────────────────────────────────────────

class UsageRequest(BaseModel):
    tanglish: str
    tamil: str = ""

class UsageBatchRequest(BaseModel):
    words: list[UsageRequest]


@router.post("/usage")
async def record_usage(
    req: UsageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Increment the frequency counter for a word when the user selects it.
    This makes frequently used words appear first in future suggestions.
    """
    result = await db.execute(
        text("""
            UPDATE words SET frequency = frequency + 1
            WHERE tanglish = :tanglish
            RETURNING tanglish, frequency
        """),
        {"tanglish": req.tanglish.lower()}
    )
    await db.commit()
    row = result.fetchone()

    if row:
        return {"status": "ok", "tanglish": row[0], "frequency": row[1]}
    return {"status": "not_found", "tanglish": req.tanglish}


@router.post("/usage/batch")
async def record_usage_batch(
    req: UsageBatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Batch-increment frequency for multiple words at once.
    Called by the frontend on a debounced timer (~30s) to avoid per-keystroke calls.
    """
    updated = 0
    for word in req.words:
        result = await db.execute(
            text("""
                UPDATE words SET frequency = frequency + 1
                WHERE tanglish = :tanglish
            """),
            {"tanglish": word.tanglish.lower()}
        )
        updated += result.rowcount

    await db.commit()
    return {"status": "ok", "updated": updated, "total": len(req.words)}


# ── Word management (Add / Delete / Count) ────────────────────────────────────

class AddWordRequest(BaseModel):
    tanglish: str
    tamil: str
    frequency: Optional[int] = 1

class AddWordBatchRequest(BaseModel):
    words: list[AddWordRequest]


@router.post("/words")
async def add_word(
    req: AddWordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Add a single Tanglish→Tamil word to the database.
    If the word already exists, its tamil mapping and frequency are updated.
    """
    tanglish = req.tanglish.lower().strip()
    tamil = req.tamil.strip()
    prefix = tanglish[0] if tanglish else "other"

    await db.execute(
        text("""
            INSERT INTO words (tanglish, tamil, prefix, frequency)
            VALUES (:tanglish, :tamil, :prefix, :frequency)
            ON CONFLICT (tanglish) DO UPDATE
            SET tamil = :tamil, frequency = :frequency
        """),
        {"tanglish": tanglish, "tamil": tamil, "prefix": prefix, "frequency": req.frequency}
    )
    await db.commit()

    return {"status": "added", "tanglish": tanglish, "tamil": tamil, "frequency": req.frequency}


@router.post("/words/batch")
async def add_words_batch(
    req: AddWordBatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Add multiple words at once.
    Existing words are updated (upsert).
    """
    added = 0
    for word in req.words:
        tanglish = word.tanglish.lower().strip()
        tamil = word.tamil.strip()
        prefix = tanglish[0] if tanglish else "other"

        await db.execute(
            text("""
                INSERT INTO words (tanglish, tamil, prefix, frequency)
                VALUES (:tanglish, :tamil, :prefix, :frequency)
                ON CONFLICT (tanglish) DO UPDATE
                SET tamil = :tamil, frequency = :frequency
            """),
            {"tanglish": tanglish, "tamil": tamil, "prefix": prefix, "frequency": word.frequency}
        )
        added += 1

    await db.commit()
    return {"status": "ok", "added": added}


@router.get("/words/count")
async def get_word_count(db: AsyncSession = Depends(get_db)):
    """Get total number of words in the database."""
    result = await db.execute(text("SELECT COUNT(*) FROM words"))
    count = result.scalar()
    return {"count": count}


@router.delete("/words")
async def delete_word(
    tanglish: str = Query(..., description="Tanglish word to delete"),
    db: AsyncSession = Depends(get_db)
):
    """Delete a word from the database by its tanglish key."""
    result = await db.execute(
        text("DELETE FROM words WHERE tanglish = :tanglish RETURNING tanglish, tamil"),
        {"tanglish": tanglish.lower().strip()}
    )
    await db.commit()
    row = result.fetchone()

    if row:
        return {"status": "deleted", "tanglish": row[0], "tamil": row[1]}
    return {"status": "not_found", "tanglish": tanglish}


@router.get("/words/search")
async def search_word(
    q: str = Query(..., description="Exact tanglish key to look up"),
    db: AsyncSession = Depends(get_db)
):
    """Look up a specific word by its exact tanglish key."""
    result = await db.execute(
        text("SELECT tanglish, tamil, frequency FROM words WHERE tanglish = :q"),
        {"q": q.lower().strip()}
    )
    row = result.fetchone()

    if row:
        return {"found": True, "tanglish": row[0], "tamil": row[1], "frequency": row[2]}
    return {"found": False, "tanglish": q}