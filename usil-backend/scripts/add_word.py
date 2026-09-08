import asyncio
from app.database import AsyncSessionLocal
from app.models.word import Word
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        # Check if it exists
        stmt = select(Word).where(Word.tanglish == 'varaverpalar')
        result = await session.execute(stmt)
        word = result.scalar_one_or_none()
        
        if word:
            word.tamil = 'வரவேற்பாளர்'
            word.frequency = 1000
            print("Updated existing word.")
        else:
            word = Word(
                tanglish='varaverpalar',
                tamil='வரவேற்பாளர்',
                frequency=1000,
                prefix='varav'
            )
            session.add(word)
            print("Added new word.")
            
        await session.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
