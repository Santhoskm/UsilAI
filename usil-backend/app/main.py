from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text
from sqladmin import Admin, ModelView

from app.database import engine, Base, AsyncSessionLocal
from app.state import trie_cache
from app.config import settings
from app.api.v1 import suggestions
from app.api.v1 import tools_service as tools
from app.api.v1 import rerank
from app.api.v1 import admin as admin_api
from app.models.word import Word, UserWordFrequency

load_dotenv()

app = FastAPI(title="Usil AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SQLAdmin Portal ───────────────────────────────────────────────────────────
class WordAdmin(ModelView, model=Word):
    name = "Dictionary Word"
    name_plural = "Dictionary Words"
    icon = "fa-solid fa-book"
    column_list = [Word.id, Word.tanglish, Word.tamil, Word.frequency, Word.prefix]
    column_searchable_list = [Word.tanglish, Word.tamil]
    column_sortable_list = [Word.id, Word.tanglish, Word.frequency]
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True
    page_size = 50


class UserWordFrequencyAdmin(ModelView, model=UserWordFrequency):
    name = "User Adaptive Frequency"
    name_plural = "User Adaptive Frequencies"
    icon = "fa-solid fa-chart-line"
    column_list = [
        UserWordFrequency.id,
        UserWordFrequency.user_id,
        UserWordFrequency.word_id,
        UserWordFrequency.usage_count,
        UserWordFrequency.last_used,
    ]
    column_searchable_list = [UserWordFrequency.user_id]
    column_sortable_list = [UserWordFrequency.usage_count, UserWordFrequency.last_used]
    can_create = True
    can_edit = True
    can_delete = True
    page_size = 50


from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = form.get("username", "")
        password = form.get("password", "")
        if username.strip() == settings.ADMIN_USERNAME and password.strip() == settings.ADMIN_PASSWORD:
            request.session.update({"token": "admin_session_authenticated"})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("token")
        if not token:
            return False
        return True


admin_auth = AdminAuth(secret_key=settings.ADMIN_SECRET_KEY)
admin_portal = Admin(
    app,
    engine,
    title="Usil AI Administration",
    base_url="/admin",
    authentication_backend=admin_auth
)
admin_portal.add_model_view(WordAdmin)
admin_portal.add_model_view(UserWordFrequencyAdmin)

# ── API Routers ───────────────────────────────────────────────────────────────
# Support both /api/usil and /api/v1 paths for direct server deployment and proxy setups
app.include_router(suggestions.router, prefix="/api/v1")
app.include_router(suggestions.router, prefix="/api/usil")
app.include_router(tools.router, prefix="/api/v1")
app.include_router(tools.router, prefix="/api/usil")
app.include_router(rerank.router, prefix="/api/v1")
app.include_router(rerank.router, prefix="/api/usil")
app.include_router(admin_api.router, prefix="/api/v1")
app.include_router(admin_api.router, prefix="/api/usil")


@app.on_event("startup")
async def startup():
    """Create tables, load Trie cache, and pre-warm ONNX reranker with failsafe error handling."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT tanglish, tamil, frequency FROM words")
            )
            for row in result.fetchall():
                trie_cache.insert(row[0], row[1], row[2] or 0)
        print(f"[Trie] Loaded {trie_cache.size} words into memory")
    except Exception as e:
        print(f"[Database] Warning: Could not connect to database on startup: {e}")
        print("[Database] Server running with Google Online API + Word Former fallback mode.")

    # Pre-warm ONNX Reranker model to avoid cold-start lag on first user keystroke
    try:
        from app.api.v1.rerank import get_reranker
        warmup_reranker = get_reranker()
        warmup_reranker.score_phrases_batch("naan pogiren", ["நான் போகிறேன்"])
        print("[Reranker] ONNX model pre-warmed successfully")
    except Exception as e:
        print(f"[Reranker] Startup warm-up note: {e}")


@app.get("/")
async def root():
    return {
        "message": "Usil AI Backend is running",
        "database": "usil_db",
        "sqladmin_portal": "/admin",
        "api_docs": "/docs",
    }


@app.get("/health")
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "error", "error": str(e)}