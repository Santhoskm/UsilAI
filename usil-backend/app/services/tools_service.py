import httpx
import json
import re
from typing import Optional, Dict, Any
from app.config import settings

class ToolsService:
    def __init__(self):
        pass

    @property
    def api_key(self) -> Optional[str]:
        return settings.ANTHROPIC_API_KEY

    async def _post_anthropic(self, payload: dict, timeout: float = 60.0) -> dict:
        if not self.api_key or self.api_key in ("your_claude_api_key_here", "your_anthropic_api_key_here", ""):
            raise ValueError("Anthropic API key is not configured on the server.")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            )
            if response.status_code != 200:
                raise RuntimeError(f"Anthropic API returned status {response.status_code}: {response.text}")
            return response.json()

    @staticmethod
    def _extract_json(text: str) -> Optional[dict]:
        clean_text = text.strip()
        # Remove markdown code fences if present
        if clean_text.startswith("```"):
            clean_text = re.sub(r"^```[a-zA-Z]*\n?", "", clean_text)
            clean_text = re.sub(r"\n?```$", "", clean_text)

        json_match = re.search(r"\{[\s\S]*\}", clean_text)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass
        return None

    async def grammar_check(self, text: str) -> Dict[str, Any]:
        """Check Tamil / Tanglish grammar using Claude API server-side."""
        if not text or not text.strip():
            return {
                "hasErrors": False,
                "corrections": [],
                "correctedTanglish": text,
                "correctedTamil": "",
                "suggestions": []
            }

        prompt = f"""You are a Tamil language grammar expert. Analyze the following text and correct any grammatical errors.

Text to check: "{text}"

Rules to check:
1. Verb conjugations (e.g., "irukeenga" should be "இருக்கீங்க")
2. Word order
3. Tense consistency
4. Respectful forms (neenga vs nee)
5. Question formation
6. Common Tamil grammar mistakes

Respond ONLY with valid JSON in this exact format (no other text before or after the JSON):

{{
    "hasErrors": true,
    "corrections": [
        {{
            "original": "original text segment",
            "corrected": "corrected text segment",
            "explanation": "brief explanation of the error",
            "type": "grammar"
        }}
    ],
    "correctedTanglish": "the fully corrected Tanglish version",
    "correctedTamil": "the fully corrected Tamil version using Tamil script",
    "suggestions": ["suggestion1", "suggestion2"]
}}

If no errors found, return:
{{
    "hasErrors": false,
    "corrections": [],
    "correctedTanglish": "{text}",
    "correctedTamil": "",
    "suggestions": []
}}"""

        payload = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "temperature": 0.3,
            "messages": [{"role": "user", "content": prompt}]
        }

        try:
            data = await self._post_anthropic(payload, timeout=35.0)
            raw_content = ""
            for block in data.get("content", []):
                if block.get("type") == "text":
                    raw_content += block.get("text", "")

            parsed = self._extract_json(raw_content)
            if parsed:
                return parsed

            return {
                "hasErrors": False,
                "corrections": [],
                "correctedTanglish": text,
                "correctedTamil": "",
                "suggestions": [],
                "raw": raw_content
            }
        except Exception as e:
            return {
                "hasErrors": False,
                "corrections": [],
                "correctedTanglish": text,
                "correctedTamil": "",
                "suggestions": [],
                "error": str(e)
            }

    async def generate_blog(
        self,
        topic: str,
        tone: str = "conversational",
        word_count: int = 500,
        instructions: str = ""
    ) -> Dict[str, Any]:
        """Generate Tamil SEO blog post using Claude API server-side."""
        prompt = f"""You are an expert Tamil content writer and SEO specialist. Generate a comprehensive blog post based on the following requirements:

TOPIC: "{topic}"
WRITING TONE: {tone}
TARGET WORD COUNT: {word_count} words
{f'ADDITIONAL INSTRUCTIONS: {instructions}' if instructions else ''}

Please generate the following in valid JSON format:

{{
  "blog": {{
    "title": "Tamil blog title (catchy and SEO-optimized)",
    "content": "Full Tamil blog content with proper formatting using line breaks. Include introduction, main points (2-3 subheadings), conclusion.",
    "meta": {{
      "wordCount": "{word_count}",
      "readingTime": "{max(1, round(word_count / 150))}",
      "tone": "{tone}"
    }}
  }},
  "seoKeywords": {{
    "primary": ["3-4 primary English keywords"],
    "secondary": ["5-6 secondary English keywords"],
    "longTail": ["4-5 long-tail English keywords"],
    "lsi": ["4-5 LSI English keywords"]
  }},
  "tamilSeoKeywords": {{
    "primary": ["3-4 primary Tamil keywords (தமிழில்)"],
    "secondary": ["5-6 secondary Tamil keywords (தமிழில்)"],
    "longTail": ["4-5 long-tail Tamil keywords (தமிழில்)"]
  }}
}}

Requirements:
- Blog content MUST be in Tamil language (Tamil script)
- Keep the tone {tone} throughout
- Include natural keyword placement
- Make it engaging and valuable for readers
- SEO keywords should be relevant to the topic
- Tamil keywords should be accurate and commonly searched
- Title should be compelling in Tamil"""

        payload = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 4000,
            "temperature": 0.7,
            "messages": [{"role": "user", "content": prompt}]
        }

        data = await self._post_anthropic(payload, timeout=75.0)
        raw_content = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                raw_content += block.get("text", "")

        parsed = self._extract_json(raw_content)
        if not parsed:
            raise ValueError("Failed to parse structured JSON from Claude response.")
        return parsed

    async def ocr_vision(self, image_base64: str, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """Extract printed Tamil text from image using Claude Vision server-side."""
        prompt = """You are a specialized Tamil language Optical Character Recognition (OCR) engine.
Your task is to transcribe ALL printed text from this Tamil document or newspaper image with high fidelity.

MANDATORY SCRIPT & ACCURACY RULES:
1. SCRIPT ENFORCEMENT: The text in this image is exclusively TAMIL SCRIPT (தமிழ் எழுத்துக்கள்). Under NO circumstances should you produce Hindi or Devanagari (देवनागरी) characters or Arabic script.
2. Output ONLY in pure Tamil Unicode characters (e.g. அ, ஆ, இ, க, ங, ச, ஞ, ட, ண, த, ந, ப, ம, ய, ர, ல, வ, ழ, ள, ற, ன, etc.).
3. Transcribe Tamil headlines, articles, subheadings, and captions with 100% exact Tamil spelling and correct ligatures (மெய், உயிர்மெய் எழுத்துக்கள்).
4. If there are English characters, initials, abbreviations, names (e.g., TVS, Holy Angel, St. Joseph), or numbers (0-9), output them in standard English / Latin digits.
5. NO META COMMENTARY: Do NOT include any descriptions, image captions, visual summaries, or bracketed notes.
6. If this is a newspaper clipping or document with multiple columns, transcribe each article column-by-column in natural reading order with appropriate headings and paragraphs.

Output ONLY the raw transcribed text. Do NOT add any preamble or explanations."""

        payload = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 3500,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        data = await self._post_anthropic(payload, timeout=60.0)
        raw_text = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                raw_text += block.get("text", "")

        return {"text": raw_text.strip()}

    async def transliterate_ai_word(self, tanglish_word: str, surrounding_tamil: str = "") -> Dict[str, Any]:
        """Fallback single-word transliteration using Claude server-side."""
        prompt = (
            f'You are a Tamil transliteration expert. The user typed "{tanglish_word}" in Tanglish. Surrounding Tamil text: "{surrounding_tamil}". What is the single most correct Tamil word for "{tanglish_word}" in this context? Reply with ONLY the Tamil word, nothing else.'
            if surrounding_tamil
            else f'You are a Tamil transliteration expert. The user typed "{tanglish_word}" in Tanglish (Tamil in English letters). What is the single most correct Tamil word? Reply with ONLY the Tamil word, nothing else.'
        )

        payload = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 50,
            "messages": [{"role": "user", "content": prompt}]
        }

        data = await self._post_anthropic(payload, timeout=15.0)
        result = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                result += block.get("text", "")

        cleaned = result.strip()
        is_tamil = bool(re.search(r"[\u0B80-\u0BFF]", cleaned))
        return {
            "tanglish": tanglish_word,
            "tamil": cleaned if is_tamil else None
        }

    async def translate_to_english(self, text: str) -> Dict[str, Any]:
        """Translate Tamil text to English using Claude server-side."""
        prompt = f"""You are a professional Tamil-to-English translator.
Translate the following spoken Tamil speech transcript accurately and fluently into English.
Maintain natural conversational grammar, preserve proper nouns, and keep all numbers/dates intact.
Output ONLY the English translation without introductory remarks, explanations, or quotes.

Tamil Transcript:
{text}"""

        payload = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1500,
            "temperature": 0.2,
            "messages": [{"role": "user", "content": prompt}]
        }

        data = await self._post_anthropic(payload, timeout=30.0)
        raw_text = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                raw_text += block.get("text", "")

        return {"translated_text": raw_text.strip()}