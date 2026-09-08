from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict
from app.utils.ranking import rank_suggestions
from app.state import trie_cache   # ✅ import from state, not main
from app.utils.word_former import generate_dynamic_tamil_words



class SuggestionService:
    def __init__(self, db: AsyncSession, trie=None):
        self.db = db
        self.trie = trie

    async def get_suggestions(self, query: str, limit: int = 10) -> List[Dict]:
        """Trie first (fast), DB fallback if trie is empty."""
        if not query:
            return []
        
        query = query.strip().lower()

        exact = await self.db.execute(
            text("""
                 SELECT tanglish, tamil, frequency
                 FROM words
                 WHERE tanglish = :query
                 LIMIT 1
            """),
            {"query": query}
        )

        exact_row = exact.fetchone()
        


        if self.trie and self.trie.size > 0:
            # 1. Get dictionary matches
            db_results = self.trie.search_prefix(query.lower(), limit)
            
            # 2. Get dynamically formed words
            dynamic_results = generate_dynamic_tamil_words(query.lower())
            
            # 3. Merge both lists together
            combined_results = db_results + dynamic_results
            
            # 4. Pass the merged list to your Deep Learning ranker!
            suggestions = rank_suggestions(combined_results, query.lower())


    #  put exact match first
            if exact_row:
                exact_word = {
                    "tanglish": exact_row.tanglish,
                    "tamil": exact_row.tamil,
                    "frequency": exact_row.frequency
                }

                suggestions = [
                    s for s in suggestions
                    if s["tamil"] != exact_row.tamil
                ]

                suggestions.insert(0, exact_word)

            return suggestions

        suggestions = await self._db_suggestions(query, limit)

#  exact match first for DB fallback also
        if exact_row:
            exact_word = {
                 "tanglish": exact_row.tanglish,
                 "tamil": exact_row.tamil,
                  "frequency": exact_row.frequency
            }

            suggestions = [
                s for s in suggestions
                if s["tamil"] != exact_row.tamil
            ]

            suggestions.insert(0, exact_word)

        return suggestions

    async def _db_suggestions(self, query: str, limit: int) -> List[Dict]:
        """Direct DB prefix query — fallback only."""
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
        rows = result.fetchall()
        db_results = [{"tanglish": r[0], "tamil": r[1], "frequency": r[2]} for r in rows]
        dynamic_results = generate_dynamic_tamil_words(query.lower())   
        combined_results = db_results + dynamic_results
        return rank_suggestions(combined_results, query.lower())


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