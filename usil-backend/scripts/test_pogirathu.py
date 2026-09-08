import sys
sys.path.append(".")
import asyncio
from app.services.suggestion_service import SuggestionService
from app.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        service = SuggestionService(session)
        results = await service.get_suggestions("pogirathu", 10)
        for i, r in enumerate(results, 1):
            print(f"{i}: {r['tamil']} (score: {r.get('score', 0):.4f})")

if __name__ == "__main__":
    asyncio.run(main())
