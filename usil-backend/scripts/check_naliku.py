"""
Check: 
  1. Does 'naalaikku' exist in the DB?
  2. What does the /api/usil/suggestions/dictionary endpoint return for it?
  3. Test the /api/usil/suggestions?q=naliku endpoint.
"""
import asyncio
import asyncpg
import httpx

DB_URL = "postgresql://postgres:12345@localhost:5432/usil_db"
API_BASE = "http://localhost:8000"

async def main():
    # ── 1. Direct DB check ──────────────────────────────────────────────
    print("=" * 60)
    print("DB CHECK — words matching 'naal%' or 'nal%'")
    print("=" * 60)
    conn = await asyncpg.connect(DB_URL)

    rows = await conn.fetch(
        "SELECT tanglish, tamil, frequency FROM words "
        "WHERE tanglish ILIKE 'naal%' OR tanglish ILIKE 'nal%' "
        "ORDER BY tanglish LIMIT 20"
    )
    if rows:
        for r in rows:
            print(f"  {r['tanglish']:20s} -> {r['tamil']}  (freq={r['frequency']})")
    else:
        print("  ❌  No rows found for naal%  or  nal%")

    # Check specifically 'naalaikku'
    exact = await conn.fetchrow(
        "SELECT tanglish, tamil FROM words WHERE tanglish = 'naalaikku'"
    )
    print()
    if exact:
        print(f"✅  'naalaikku' IS in DB  ->  {exact['tamil']}")
    else:
        print("❌  'naalaikku' is NOT in DB")

    await conn.close()

    # ── 2. API: full dictionary (check if naalaikku is returned) ────────
    print()
    print("=" * 60)
    print("API CHECK — /api/usil/suggestions/dictionary")
    print("=" * 60)
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(f"{API_BASE}/api/usil/suggestions/dictionary")
            if r.status_code == 200:
                data = r.json()
                total = len(data)
                print(f"  Dictionary endpoint returned {total} words")
                # Look for naliku variants
                found = {k: v for k, v in data.items()
                         if 'nal' in k.lower() or 'naal' in k.lower()}
                if found:
                    print("  Words matching 'nal'/'naal':")
                    for k, v in list(found.items())[:15]:
                        print(f"    {k:20s} -> {v}")
                else:
                    print("  ❌  No 'naal'/'nal' words in dictionary response")
            else:
                print(f"  ❌  HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"  ❌  Error: {e}")

    # ── 3. API: suggestions for 'naliku' ────────────────────────────────
    print()
    print("=" * 60)
    print("API CHECK — /api/usil/suggestions?q=naliku")
    print("=" * 60)
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{API_BASE}/api/usil/suggestions", params={"q": "naliku", "limit": 5})
            if r.status_code == 200:
                suggestions = r.json()
                if suggestions:
                    print(f"  Got {len(suggestions)} suggestions:")
                    for s in suggestions:
                        print(f"    {s}")
                else:
                    print("  ❌  No suggestions returned for 'naliku'")
            else:
                print(f"  ❌  HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"  ❌  Error: {e}")

    # ── 4. API: suggestions for 'naalaikku' ─────────────────────────────
    print()
    print("=" * 60)
    print("API CHECK — /api/usil/suggestions?q=naalaikku")
    print("=" * 60)
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{API_BASE}/api/usil/suggestions", params={"q": "naalaikku", "limit": 5})
            if r.status_code == 200:
                suggestions = r.json()
                if suggestions:
                    print(f"  Got {len(suggestions)} suggestions:")
                    for s in suggestions:
                        print(f"    {s}")
                else:
                    print("  ❌  No suggestions returned for 'naalaikku'")
            else:
                print(f"  ❌  HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"  ❌  Error: {e}")

asyncio.run(main())
