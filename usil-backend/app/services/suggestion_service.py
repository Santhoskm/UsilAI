from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
import asyncio
from app.utils.word_former import generate_dynamic_tamil_words
from app.utils.morph_engine import MorphEngine
from app.utils.ranking import rank_combinations
from app.services.google_input_service import fetch_google_candidates

class SuggestionService:
    def __init__(self, db: AsyncSession, trie=None, morph_engine=None):
        self.db = db
        self.trie = trie
        self.morph_engine = morph_engine or MorphEngine()

    async def get_suggestions(self, phrase: str, limit: int = 10, session_cache: Dict = None) -> List[Dict]:
        """
        Generate candidates for the last word and context words, then rank combinations.
        
        Architecture Mode: ONLINE API PRIMARY (Google Input Tools)
        - Primary Driver: Google Input Tools API provides online phonetic transliterations
          for all words on every keystroke.
        - Custom & Resilience Layer: Local Trie and Syllable Former serve as backup/enrichment
          (ensuring terms like 'dev' -> 'தேவ்' which Google ignores are never lost).
        """
        if not phrase:
            return []
            
        words = phrase.strip().split()
        if not words:
            return []
            
        current_word = words[-1]
        context_words = words[-3:-1]  # Up to 2 preceding words
        
        # 1. Context candidates for sentence-level ranking (local Trie/Morph)
        context_candidates = []
        for ctx_w in context_words:
            results = self.trie.fuzzy_search_prefix(ctx_w.lower(), max_cost=0.5, limit=3) if self.trie else []
            cands = [r["tamil"] for r in results]
            if not cands:
                morph_res = self.morph_engine.generate_morph_candidates(ctx_w.lower(), self.trie, limit=3) if self.trie else []
                cands = [d["tamil"] for d in morph_res[:3]] if morph_res else []
                if not cands:
                    dyn = generate_dynamic_tamil_words(ctx_w.lower())
                    cands = [d["tamil"] for d in dyn[:3]]
            context_candidates.append(cands if cands else [ctx_w])
            
        # 2. PRIMARY DRIVER: Query Google Input Tools API Online
        google_task = fetch_google_candidates(current_word.lower(), limit=limit)
        
        # In parallel, prepare local backup/enrichment candidates
        db_results = self.trie.fuzzy_search_prefix(current_word.lower(), max_cost=0.8, limit=limit) if self.trie else []
        
        # Await Google API response
        google_cands = await google_task
        
        google_results = []
        seen_tamil = set()
        
        # Prioritize Google online candidates FIRST
        for i, cand in enumerate(google_cands):
            if cand and cand not in seen_tamil:
                seen_tamil.add(cand)
                google_results.append({
                    "tanglish": current_word.lower(),
                    "tamil": cand,
                    "frequency": max(10000, 60000 - (i * 2000)),
                    "cost": 0.0,
                    "source": "google_online"
                })

        # 3. Custom / Fallback enrichment (e.g. 'dev' -> 'தேவ்' which Google returns empty for)
        fallback_results = []
        for r in db_results:
            tw = r.get("tamil")
            if tw and tw not in seen_tamil:
                seen_tamil.add(tw)
                fallback_results.append(r)
                
        # If both Google and Trie have no candidates, use dynamic word former
        if not google_results and not fallback_results:
            dynamic_raw = generate_dynamic_tamil_words(current_word.lower())
            for d in dynamic_raw:
                tw = d.get("tamil")
                if tw and tw not in seen_tamil:
                    seen_tamil.add(tw)
                    fallback_results.append(d)

        # Google results are PRIMARY (front of list), fallback enriches the rest
        combined_current = google_results + fallback_results
        
        # 4. Rank combinations via sentence-level Deep Learning / Fast-path scoring
        suggestions = rank_combinations(
            combined_current,
            phrase.lower(),
            context_candidates,
            limit,
            session_cache=session_cache
        )

        return suggestions

    async def get_fuzzy_suggestions(self, phrase: str, limit: int = 10, session_cache: Dict = None) -> List[Dict]:
        """Fuzzy suggestion mode — delegates to get_suggestions()."""
        return await self.get_suggestions(phrase, limit, session_cache)