import httpx
from typing import Optional
from app.config import settings

class ToolsService:
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        
    async def grammar_check(self, text: str) -> dict:
        """Check grammar using Claude API"""
        if not self.api_key:
            return {"error": "API key not configured"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 1024,
                    "messages": [{
                        "role": "user",
                        "content": f"Check Tamil grammar: {text}"
                    }]
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            return {"error": f"API error: {response.status_code}"}
    
    async def transliterate(self, text: str) -> dict:
        """Transliterate Tanglish to Tamil"""
        # You can implement rules-based transliteration here
        # or call external API
        return {"original": text, "transliterated": ""}