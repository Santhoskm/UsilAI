"""
Add words to usil_db — CLI tool

Usage:
  # Add a single word:
  python scripts/add_words.py vanakkam வணக்கம்

  # Add multiple words from a JSON file:
  python scripts/add_words.py --file scripts/my_words.json

  # JSON file format: {"vanakkam": "வணக்கம்", "nandri": "நன்றி"}
"""
import asyncio
import json
import sys
import os

# Fix Windows console encoding for Tamil characters
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add the backend root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal  # pyrefly: ignore [missing-import]
# pyrefly: ignore [missing-import]
from sqlalchemy import text


async def add_single_word(tanglish: str, tamil: str, frequency: int = 1):
    """Add one word to the database."""
    tanglish = tanglish.lower().strip()
    tamil = tamil.strip()
    prefix = tanglish[0] if tanglish else "other"

    async with AsyncSessionLocal() as session:
        await session.execute(
            text("""
                INSERT INTO words (tanglish, tamil, prefix, frequency)
                VALUES (:tanglish, :tamil, :prefix, :frequency)
                ON CONFLICT (tanglish) DO UPDATE
                SET tamil = :tamil, frequency = :frequency
            """),
            {"tanglish": tanglish, "tamil": tamil, "prefix": prefix, "frequency": frequency}
        )
        await session.commit()
        print(f"  ✅  {tanglish} → {tamil}  (frequency={frequency})")


async def add_from_file(filepath: str):
    """Load words from a JSON file and insert them."""
    if not os.path.exists(filepath):
        print(f"[ERROR] File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"[INFO] Found {len(data)} words in {filepath}")

    async with AsyncSessionLocal() as session:
        count = 0
        for tanglish, tamil in data.items():
            tanglish = tanglish.lower().strip()
            tamil = tamil.strip() if isinstance(tamil, str) else tamil
            prefix = tanglish[0] if tanglish else "other"

            # If value is a dict like {"t": "தமிழ்", "f": 5}
            if isinstance(tamil, dict):
                freq = tamil.get("f", 1)
                tamil = tamil.get("t", "")
            else:
                freq = 1

            await session.execute(
                text("""
                    INSERT INTO words (tanglish, tamil, prefix, frequency)
                    VALUES (:tanglish, :tamil, :prefix, :frequency)
                    ON CONFLICT (tanglish) DO UPDATE
                    SET tamil = :tamil, frequency = :frequency
                """),
                {"tanglish": tanglish, "tamil": tamil, "prefix": prefix, "frequency": freq}
            )
            count += 1

        await session.commit()
        print(f"[DONE] Added/updated {count} words to usil_db")


async def show_word(tanglish: str):
    """Look up a word in the database."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT tanglish, tamil, frequency FROM words WHERE tanglish = :q"),
            {"q": tanglish.lower().strip()}
        )
        row = result.fetchone()
        if row:
            print(f"  📖  {row[0]} → {row[1]}  (frequency={row[2]})")
        else:
            print(f"  ❌  '{tanglish}' not found in database")


def print_help():
    print("""
╔══════════════════════════════════════════════════════════╗
║          Usil DB — Add Words CLI Tool                   ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Add a single word:                                      ║
║    python scripts/add_words.py vanakkam வணக்கம்          ║
║                                                          ║
║  Add from a JSON file:                                   ║
║    python scripts/add_words.py --file words.json         ║
║                                                          ║
║  Look up a word:                                         ║
║    python scripts/add_words.py --search vanakkam         ║
║                                                          ║
║  JSON format:                                            ║
║    {"vanakkam": "வணக்கம்", "nandri": "நன்றி"}            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    """)


if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] in ("--help", "-h"):
        print_help()
        sys.exit(0)

    if args[0] == "--file" and len(args) >= 2:
        asyncio.run(add_from_file(args[1]))
    elif args[0] == "--search" and len(args) >= 2:
        asyncio.run(show_word(args[1]))
    elif len(args) >= 2:
        # Direct: python add_words.py vanakkam வணக்கம்
        tanglish = args[0]
        tamil = args[1]
        freq = int(args[2]) if len(args) >= 3 else 1
        asyncio.run(add_single_word(tanglish, tamil, freq))
    else:
        print("[ERROR] Need at least: <tanglish> <tamil>")
        print_help()
