import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        # Search for thalchi
        res = await session.execute(text("SELECT tanglish, tamil, frequency FROM words WHERE tanglish LIKE 'thal%' LIMIT 10"))
        print("Words starting with thal:")
        for r in res.fetchall():
            print(r)
            
        res = await session.execute(text("SELECT tanglish, tamil, frequency FROM words WHERE tamil = 'டெல்லியைச்' LIMIT 10"))
        print("\nTanglish for டெல்லியைச்:")
        for r in res.fetchall():
            print(r)

if __name__ == "__main__":
    asyncio.run(main())
