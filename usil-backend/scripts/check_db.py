import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as s:
        r = await s.execute(text("SELECT COUNT(*) FROM words"))
        count = r.scalar()
        print(f"Word count: {count}")

        r2 = await s.execute(text("SELECT tanglish, tamil FROM words LIMIT 5"))
        rows = r2.fetchall()
        for row in rows:
            print(f"  {row[0]} -> {row[1]}")

asyncio.run(check())
