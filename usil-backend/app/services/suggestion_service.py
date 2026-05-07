# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from typing import List, Dict

class SuggestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_suggestions(self, query: str, limit: int = 10) -> List[Dict]:
        """Get word suggestions from usil_db"""
        
        if not query or len(query) < 1:
            return []
        
        # Query using the prefix index
        result = await self.db.execute(
            text("""
                SELECT tanglish, tamil, frequency
                FROM words 
                WHERE tanglish LIKE :prefix 
                ORDER BY frequency DESC, tanglish 
                LIMIT :limit
            """),
            {"prefix": f"{query.lower()}%", "limit": limit}
        )
        
        suggestions = result.fetchall()
        
        return [
            {
                "tanglish": row[0],
                "tamil": row[1],
                "frequency": row[2]
            }
            for row in suggestions
        ]
    
    async def get_fuzzy_suggestions(self, query: str, limit: int = 10) -> List[Dict]:
        """Get fuzzy suggestions using trigram similarity (typo tolerance)"""
        
        result = await self.db.execute(
            text("""
                SELECT tanglish, tamil, frequency,
                       similarity(tanglish, :query) as sim
                FROM words 
                WHERE tanglish % :query
                ORDER BY sim DESC, frequency DESC
                LIMIT :limit
            """),
            {"query": query.lower(), "limit": limit}
        )
        
        suggestions = result.fetchall()
        
        return [
            {
                "tanglish": row[0],
                "tamil": row[1],
                "frequency": row[2],
                "similarity": float(row[3]) if len(row) > 3 else 0
            }
            for row in suggestions
        ]