import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def fix_database():
    print("Connecting to database...")
    async with AsyncSessionLocal() as session:
        # 1. Update Pallipalayam
        await session.execute(
            text("""
                UPDATE words 
                SET tanglish = 'pallipalayam' 
                WHERE tanglish = 'palapalam' AND tamil = 'பள்ளிபாளையம்';
            """)
        )
        
        # 2. Delete corrupt words for palapalam
        print("Cleaning up corrupted entries for 'palapalam'...")
        await session.execute(
            text("""
                DELETE FROM words 
                WHERE tanglish = 'palapalam' AND tamil NOT IN ('பலபலம்', 'பளபலாம்', 'பளபளாம்', 'பலபலாம்');
            """)
        )
        
        await session.commit()
        print("Database successfully fixed!")

if __name__ == "__main__":
    asyncio.run(fix_database())
