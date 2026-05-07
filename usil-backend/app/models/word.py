# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, BigInteger, Text, Index, ForeignKey, DateTime
# pyrefly: ignore [missing-import]
from sqlalchemy.sql import func
from app.database import Base


class Word(Base):
    __tablename__ = "words"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tanglish = Column(String(100), nullable=False, unique=True)
    tamil = Column(Text, nullable=False)
    frequency = Column(Integer, default=0)
    prefix = Column(String(10), nullable=False)

    __table_args__ = (
        Index("idx_tanglish_prefix", "prefix", "tanglish"),
        Index("idx_frequency_desc", "frequency"),
        Index("idx_tanglish_search", "tanglish"),
    )


class UserWordFrequency(Base):
    __tablename__ = "user_word_frequencies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(100), nullable=False)
    word_id = Column(BigInteger, ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_user_word", "user_id", "word_id"),
    )