import asyncio
import json
import sys
import os

# Fix Windows console encoding for Tamil characters
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add the backend root to the Python path so app imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models.word import Word
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert


async def load_dictionary():
    print("[INFO] Loading Tamil dictionary into usil_db...")

    # ─────────────────────────────────────────────────────────────────────────────
    # DICTIONARY PATH – tamilDictionary.json is inside usil-backend/data/
    # To add/update words, edit:  usil-backend/data/tamilDictionary.json
    # ─────────────────────────────────────────────────────────────────────────────
    script_dir = os.path.dirname(os.path.abspath(__file__))          # usil-backend/scripts
    backend_dir = os.path.dirname(script_dir)                         # usil-backend
    dict_path = os.path.join(backend_dir, "data", "tamilDictionary.json")

    if not os.path.exists(dict_path):
        print(f"[ERROR] Dictionary file not found at: {dict_path}")
        print("Current working directory:", os.getcwd())
        return

    print(f"[OK] Dictionary found: {dict_path}")

    async with AsyncSessionLocal() as session:
        # Check existing word count
        result = await session.execute(text("SELECT COUNT(*) FROM words"))
        count = result.scalar()

        if count > 0:
            print(f"[WARN] Database already has {count} words.")
            response = input("Add/update words anyway? (y/n): ")
            if response.strip().lower() != "y":
                print("Skipping load.")
                return

        with open(dict_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"[INFO] Total words in dictionary: {len(data)}")

        rows = [
            {
                "tanglish": tanglish.lower().strip(),
                "tamil": tamil,
                "prefix": (tanglish[0].lower() if tanglish else "other"),
                "frequency": 1,
            }
            for tanglish, tamil in data.items()
            if tanglish and tamil  # skip empty entries
        ]

        batch_size = 1000
        total = len(rows)

        for i in range(0, total, batch_size):
            batch = rows[i : i + batch_size]

            # ON CONFLICT DO NOTHING - safe to run multiple times
            stmt = pg_insert(Word).values(batch).on_conflict_do_nothing(
                index_elements=["tanglish"]
            )
            await session.execute(stmt)
            await session.commit()
            print(f"  [OK] Loaded {min(i + batch_size, total):,} / {total:,} words...")

        result = await session.execute(text("SELECT COUNT(*) FROM words"))
        final_count = result.scalar()
        print(f"\n[DONE] {final_count:,} words now in usil_db.words")


if __name__ == "__main__":
    asyncio.run(load_dictionary())