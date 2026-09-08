import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/api/usil/suggestions/dictionary")
        data = r.json()
        print(f"Total words: {len(data)}")
        if "varaverpalar" in data:
            print("varaverpalar is in dictionary:", data["varaverpalar"])
        else:
            print("varaverpalar is MISSING!")

if __name__ == "__main__":
    asyncio.run(main())
