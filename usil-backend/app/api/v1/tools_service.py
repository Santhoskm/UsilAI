from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from app.services.tools_service import ToolsService

router = APIRouter(prefix="/tools", tags=["tools"])
tools_service = ToolsService()


class GrammarRequest(BaseModel):
    text: str = Field(..., min_length=1)


class BlogRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    tone: str = Field("conversational")
    word_count: int = Field(500, ge=100, le=2500)
    instructions: Optional[str] = Field("")


class OCRVisionRequest(BaseModel):
    image_base64: str = Field(..., min_length=1)
    mime_type: str = Field("image/jpeg")


class AIWordRequest(BaseModel):
    tanglish_word: str = Field(..., min_length=1)
    surrounding_tamil: Optional[str] = Field("")


@router.post("/grammar")
async def check_grammar(request: GrammarRequest):
    """AI Grammar check using Claude (server-side secure execution)."""
    if not request.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required")
    result = await tools_service.grammar_check(request.text)
    return result


@router.post("/blog")
async def generate_blog(request: BlogRequest):
    """Generate Tamil SEO blog post using Claude (server-side secure execution)."""
    try:
        result = await tools_service.generate_blog(
            topic=request.topic,
            tone=request.tone,
            word_count=request.word_count,
            instructions=request.instructions or ""
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI service error: {str(e)}")


@router.post("/ocr")
async def ocr_vision(request: OCRVisionRequest):
    """Extract Tamil text from image via Claude Vision (server-side secure execution)."""
    try:
        result = await tools_service.ocr_vision(
            image_base64=request.image_base64,
            mime_type=request.mime_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"OCR Vision error: {str(e)}")


@router.post("/ai-word")
async def transliterate_ai_word(request: AIWordRequest):
    """Translate single Tanglish word to Tamil via Claude (server-side secure execution)."""
    try:
        result = await tools_service.transliterate_ai_word(
            tanglish_word=request.tanglish_word,
            surrounding_tamil=request.surrounding_tamil or ""
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI word error: {str(e)}")


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)


@router.post("/translate")
async def translate_text(request: TranslateRequest):
    """Translate Tamil text to English via Claude (server-side secure execution)."""
    try:
        result = await tools_service.translate_to_english(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Translation error: {str(e)}")