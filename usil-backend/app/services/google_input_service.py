import httpx
from typing import List, Optional

GOOGLE_INPUT_URL = "https://inputtools.google.com/request"
_MEMORY_CACHE: dict[str, List[str]] = {}
_MAX_CACHE_SIZE = 10000

# Persistent client for HTTP connection reuse (re-uses TLS/TCP sockets)
_CLIENT: Optional[httpx.AsyncClient] = None

def _get_http_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(
            timeout=0.4,  # 400ms fast timeout so typing is never blocked
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
        )
    return _CLIENT


async def fetch_google_candidates(tanglish: str, limit: int = 5) -> List[str]:
    """
    Fetch Tamil transliterations from Google Input Tools API with persistent keep-alive.
    """
    word = tanglish.strip().lower()
    if not word:
        return []

    # Check in-memory LRU cache first
    if word in _MEMORY_CACHE:
        return _MEMORY_CACHE[word][:limit]

    params = {
        "text": word,
        "itc": "ta-t-i0-und",  # Tamil phonetic input tool code
        "num": str(limit),
        "cp": "0",
        "cs": "1",
        "ie": "utf-8",
        "oe": "utf-8",
        "app": "demopage",
    }

    try:
        client = _get_http_client()
        resp = await client.get(GOOGLE_INPUT_URL, params=params)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 1 and data[0] == "SUCCESS" and data[1]:
                candidates = data[1][0][1]
                if len(_MEMORY_CACHE) > _MAX_CACHE_SIZE:
                    _MEMORY_CACHE.clear()
                _MEMORY_CACHE[word] = candidates
                return candidates[:limit]
    except Exception:
        # Failsafe: on timeout, network disconnect, or rate-limit, fail silently
        pass

    return []
