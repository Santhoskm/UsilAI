# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, text
from app.models.word import Word

class WordRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_words_by_prefix(self, prefix: str, limit: int = 10) -> list:
        """Fast prefix search using the index"""
        prefix_lower = prefix.lower()
        
        query = select(Word).where(
            Word.tanglish.startswith(prefix_lower)
        ).order_by(Word.frequency.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_words_by_prefix_ilike(self, prefix: str, limit: int = 10) -> list:
        """Case-insensitive prefix search (slower)"""
        query = select(Word).where(
            Word.tanglish.ilike(f"{prefix}%")
        ).order_by(Word.frequency.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def batch_insert_words(self, words: list):
        """Bulk insert for initial data load"""
        # pyrefly: ignore [missing-import]
        from sqlalchemy.dialects.postgresql import insert
        
        stmt = insert(Word).values(words)
        stmt = stmt.on_conflict_do_update(
            index_elements=['tanglish'],
            set_={'tamil': stmt.excluded.tamil}
        )
        await self.db.execute(stmt)
        await self.db.commit()