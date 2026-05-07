# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.api.v1 import suggestions
from app.api.v1 import tools_service as tools
from app.database import engine, Base

# ──────────────────────────────────────────────────────────────────────────────
# IMPORTANT: Import ALL models here so SQLAlchemy knows about every table
# before Base.metadata.create_all() is called at startup.
# ──────────────────────────────────────────────────────────────────────────────
from app.models import word  # noqa: F401  (registers Word & UserWordFrequency)

load_dotenv()

app = FastAPI(title="Usil AI Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://192.168.1.8:5173",
        "http://192.168.1.8:3000",
        "http://192.168.1.8",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(suggestions.router, prefix="/api/v1")
app.include_router(tools.router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    """Create tables if they don't exist yet (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {"message": "Usil AI Backend is running", "database": "usil_db"}


@app.get("/health")
async def health():
    """Test DB connectivity."""
    try:
        async with engine.connect() as conn:
            # text() is REQUIRED for raw SQL in SQLAlchemy 2.x async
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "error", "error": str(e)}