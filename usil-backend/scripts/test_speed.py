import asyncio
import time
from app.database import AsyncSessionLocal
from app.services.suggestion_service import SuggestionService
from app.state import trie_cache

async def main():
    async with AsyncSessionLocal() as session:
        service = SuggestionService(session, trie_cache)
        start = time.time()
        await service.get_suggestions("varaverpalar", 10)
        print(f"Run 1: {time.time() - start:.4f} seconds")
        
        start = time.time()
        await service.get_suggestions("pogum", 10)
        print(f"Run 2: {time.time() - start:.4f} seconds")

if __name__ == "__main__":
    asyncio.run(main())
