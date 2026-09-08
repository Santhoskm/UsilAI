import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.services.suggestion_service import SuggestionService
from app.state import trie_cache

async def main():
    async with AsyncSessionLocal() as session:
        service = SuggestionService(session, trie_cache)
        print("Fetching suggestions for 'vanga'...")
        try:
            results = await service.get_suggestions("vanga")
            print(f"Success! Got {len(results)} results:")
            for r in results:
                print(r)
        except Exception as e:
            print("ERROR IN PIPELINE:", e)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
