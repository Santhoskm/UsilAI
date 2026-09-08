import asyncio
import json
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def test_db():
    async with AsyncSessionLocal() as session:
        # Check what matches palapalam exactly
        result = await session.execute(text("SELECT tanglish, tamil FROM words WHERE tanglish = 'palapalam'"))
        exact = result.fetchall()
        
        # Check what starts with palapalam
        result = await session.execute(text("SELECT tanglish, tamil FROM words WHERE tanglish LIKE 'palapalam%'"))
        prefix = result.fetchall()

        with open('db_results.json', 'w', encoding='utf-8') as f:
            json.dump({
                "exact": [{"tanglish": r[0], "tamil": r[1]} for r in exact],
                "prefix": [{"tanglish": r[0], "tamil": r[1]} for r in prefix]
            }, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    asyncio.run(test_db())
