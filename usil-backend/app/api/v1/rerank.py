from fastapi import APIRouter
from pydantic import BaseModel
from app.services.reranker_service import RerankerService

router = APIRouter(prefix="/rerank", tags=["rerank"])

# Load once at startup
_reranker = None

def get_reranker():
    global _reranker
    if _reranker is None:
        _reranker = RerankerService(model_dir="reranker")
    return _reranker

class RerankRequest(BaseModel):
    tanglish: str
    candidates: list[str]

@router.post("/")
async def rerank(req: RerankRequest):
    reranker = get_reranker()
    scored = reranker.score(req.tanglish, req.candidates)
    return {
        "tanglish": req.tanglish,
        "ranked": scored   # [{tamil: "...", score: 0.97}, ...]
    }


# ── Sentence-level phrase scoring endpoint ────────────────────────────────────

class RerankPhraseRequest(BaseModel):
    tanglish: str
    phrases: list[str]

@router.post("/phrase")
async def rerank_phrase(req: RerankPhraseRequest):
    """
    Score complete Tamil phrase candidates against the full Tanglish phrase.
    Use this to test sentence-level coherence scoring.

    Example:
        tanglish: "naan padikka pogiren"
        phrases:  ["நான் படிக்க போகிறேன்", "நான் படிக்க போகிறான்"]
    """
    reranker = get_reranker()
    scores = reranker.score_phrases_batch(req.tanglish, req.phrases)
    ranked = [
        {"phrase": phrase, "score": score}
        for phrase, score in sorted(zip(req.phrases, scores), key=lambda x: x[1], reverse=True)
    ]
    return {
        "tanglish": req.tanglish,
        "ranked": ranked
    }