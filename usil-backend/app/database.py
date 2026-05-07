# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base
# pyrefly: ignore [missing-import]
from sqlalchemy import text
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL async connection to usil_db
# Format: postgresql+asyncpg://<user>:<password>@<host>:<port>/<database>
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:12345@localhost:5432/usil_db"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=True,          # Set to False in production
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True  # Automatically reconnect on stale connections
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    """Dependency: yields a DB session and ensures it is closed after use."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()