from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.tools_service import ToolsService

router = APIRouter(prefix="/tools", tags=["tools"])
tools_service = ToolsService()

class GrammarRequest(BaseModel):
    text: str

@router.post("/grammar")
async def check_grammar(request: GrammarRequest):
    """AI Grammar check using Claude"""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    result = await tools_service.grammar_check(request.text)
    return result

@router.post("/transliterate")
async def transliterate(request: GrammarRequest):
    """Convert Tanglish to Tamil"""
    result = await tools_service.transliterate(request.text)
    return result