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