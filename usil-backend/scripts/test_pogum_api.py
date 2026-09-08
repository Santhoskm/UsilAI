import asyncio
from app.database import AsyncSessionLocal
from app.services.suggestion_service import SuggestionService
from app.state import trie_cache

async def main():
    async with AsyncSessionLocal() as session:
        service = SuggestionService(session, trie_cache)
        print("Fetching suggestions for 'pogum'...")
        results = await service.get_suggestions("pogum", 10)
        for i, r in enumerate(results):
            print(f"{i+1}: {r['tamil']} (from tanglish: {r['tanglish']})")

if __name__ == "__main__":
    asyncio.run(main())
