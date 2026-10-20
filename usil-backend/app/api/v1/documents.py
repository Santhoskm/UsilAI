from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.document import UserDocument

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentItem(BaseModel):
    id: str
    title: str = "New File"
    content: str = ""
    plain_text: str = ""
    word_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentsSyncRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=150)
    documents: List[DocumentItem] = Field(..., max_length=5)


@router.get("/")
async def get_user_documents(
    user_id: str = Query(..., min_length=1, max_length=150, description="Unique user identifier"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve up to 5 stored documents for the specified user."""
    stmt = (
        select(UserDocument)
        .where(UserDocument.user_id == user_id)
        .order_by(desc(UserDocument.updated_at))
        .limit(5)
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()

    formatted_docs = [
        {
            "id": doc.id,
            "title": doc.title,
            "content": doc.content,
            "plain_text": doc.plain_text,
            "word_count": doc.word_count,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        }
        for doc in docs
    ]

    return {
        "user_id": user_id,
        "documents": formatted_docs,
        "count": len(formatted_docs)
    }


@router.post("/sync")
async def sync_user_documents(
    payload: DocumentsSyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Save or update up to 5 documents for the specified user.
    Enforces maximum 5 files constraint per user.
    """
    if len(payload.documents) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users are limited to a maximum of 5 saved documents."
        )

    user_id = payload.user_id
    synced_ids = set()

    for item in payload.documents:
        synced_ids.add(item.id)
        # Check if document already exists
        stmt = select(UserDocument).where(
            UserDocument.id == item.id,
            UserDocument.user_id == user_id
        )
        res = await db.execute(stmt)
        existing_doc = res.scalar_one_or_none()

        if existing_doc:
            existing_doc.title = item.title
            existing_doc.content = item.content
            existing_doc.plain_text = item.plain_text
            existing_doc.word_count = item.word_count
        else:
            new_doc = UserDocument(
                id=item.id,
                user_id=user_id,
                title=item.title,
                content=item.content,
                plain_text=item.plain_text,
                word_count=item.word_count
            )
            db.add(new_doc)

    # Clean up any old documents for this user that were deleted from client
    if synced_ids:
        del_stmt = delete(UserDocument).where(
            UserDocument.user_id == user_id,
            UserDocument.id.not_in(synced_ids)
        )
        await db.execute(del_stmt)

    await db.commit()

    return {
        "success": True,
        "user_id": user_id,
        "saved_count": len(payload.documents)
    }


@router.delete("/{doc_id}")
async def delete_user_document(
    doc_id: str,
    user_id: str = Query(..., min_length=1, max_length=150),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific document for a user."""
    del_stmt = delete(UserDocument).where(
        UserDocument.id == doc_id,
        UserDocument.user_id == user_id
    )
    result = await db.execute(del_stmt)
    await db.commit()

    return {
        "success": True,
        "deleted_id": doc_id,
        "rows_affected": result.rowcount
    }
