from sqlalchemy import Column, String, Text, Integer, DateTime, Index
from sqlalchemy.sql import func
from app.database import Base


class UserDocument(Base):
    __tablename__ = "user_documents"

    id = Column(String(100), primary_key=True)
    user_id = Column(String(150), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New File")
    content = Column(Text, nullable=False, default="")
    plain_text = Column(Text, nullable=False, default="")
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_user_documents_user_updated", "user_id", "updated_at"),
    )
