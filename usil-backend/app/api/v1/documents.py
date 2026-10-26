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
    background_image: Optional[str] = ""
    background_mode: Optional[str] = "cover"
    background_opacity: Optional[float] = 0.2
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentsSyncRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=150)
    documents: List[DocumentItem] = Field(..., max_length=5)


@router.get("")
@router.get("/")
async def get_user_documents(
    user_id: str = Query(..., min_length=1, max_length=150, description="Unique user identifier"),
    alt_id: Optional[str] = Query(None, max_length=150, description="Optional alternate user identifier (Google sub or email)"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve up to 5 stored documents for the specified user."""
    query_ids = [user_id]
    if alt_id and alt_id != user_id:
        query_ids.append(alt_id)

    stmt = (
        select(UserDocument)
        .where(UserDocument.user_id.in_(query_ids))
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
            "background_image": doc.background_image or "",
            "background_mode": doc.background_mode or "cover",
            "background_opacity": float(doc.background_opacity) if doc.background_opacity is not None else 0.2,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        }
        for doc in docs
    ]

    # Automatically migrate any documents found under alt_id to the primary user_id
    if alt_id and alt_id != user_id:
        migrated = False
        for doc in docs:
            if doc.user_id != user_id:
                doc.user_id = user_id
                migrated = True
        if migrated:
            await db.commit()

    return {
        "user_id": user_id,
        "documents": formatted_docs,
        "count": len(formatted_docs)
    }


@router.post("/sync")
@router.post("/sync/")
async def sync_user_documents(
    payload: DocumentsSyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Save or update up to 5 documents for the specified user.
    Enforces maximum 5 files constraint per user.
    Safely upserts documents without deleting unmentioned ones.
    """
    if len(payload.documents) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users are limited to a maximum of 5 saved documents."
        )

    user_id = payload.user_id

    # 1. Fetch all existing document IDs for this user
    existing_stmt = select(UserDocument.id).where(UserDocument.user_id == user_id)
    existing_ids = set((await db.execute(existing_stmt)).scalars().all())

    # 2. Check how many genuinely new documents are being added
    new_doc_items = [item for item in payload.documents if item.id not in existing_ids]

    # Enforce strictly: total existing + new cannot exceed 5
    if len(existing_ids) + len(new_doc_items) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account file limit reached: maximum 5 documents allowed (currently {len(existing_ids)}). Please delete an existing file first."
        )

    for item in payload.documents:
        bg_img = item.background_image or ""
        bg_mode = item.background_mode or "cover"
        bg_opacity = item.background_opacity if item.background_opacity is not None else 0.2

        if item.id in existing_ids:
            # Update existing document
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
                existing_doc.background_image = bg_img
                existing_doc.background_mode = bg_mode
                existing_doc.background_opacity = bg_opacity
        else:
            new_doc = UserDocument(
                id=item.id,
                user_id=user_id,
                title=item.title,
                content=item.content,
                plain_text=item.plain_text,
                word_count=item.word_count,
                background_image=bg_img,
                background_mode=bg_mode,
                background_opacity=bg_opacity
            )
            db.add(new_doc)
            existing_ids.add(item.id)

    # 3. Hard safety enforcement: never allow more than 5 documents in PostgreSQL
    prune_stmt = (
        select(UserDocument.id)
        .where(UserDocument.user_id == user_id)
        .order_by(desc(UserDocument.updated_at))
    )
    all_current_ids = (await db.execute(prune_stmt)).scalars().all()
    if len(all_current_ids) > 5:
        excess = all_current_ids[5:]
        await db.execute(
            delete(UserDocument).where(
                UserDocument.user_id == user_id,
                UserDocument.id.in_(excess)
            )
        )

    await db.commit()

    return {
        "success": True,
        "user_id": user_id,
        "total_documents": min(len(existing_ids), 5),
        "saved_count": len(payload.documents)
    }


@router.delete("/{doc_id}")
@router.delete("/{doc_id}/")
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
