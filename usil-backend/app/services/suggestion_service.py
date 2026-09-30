from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
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
        """Generate candidates for the last word and context words, then rank combinations."""
        if not phrase:
            return []
            
        words = phrase.strip().split()
        if not words:
            return []
            
        current_word = words[-1]
        context_words = words[-3:-1]  # Up to 2 preceding words
        
        # 1. Get exact/near candidates for context words (purely local & fast)
        context_candidates = []
        for ctx_w in context_words:
            results = self.trie.fuzzy_search_prefix(ctx_w.lower(), max_cost=0.5, limit=3)
            cands = [r["tamil"] for r in results]
            if not cands:
                morph_res = self.morph_engine.generate_morph_candidates(ctx_w.lower(), self.trie, limit=3)
                cands = [d["tamil"] for d in morph_res[:3]] if morph_res else []
                if not cands:
                    dyn = generate_dynamic_tamil_words(ctx_w.lower())
                    cands = [d["tamil"] for d in dyn[:3]]
            context_candidates.append(cands if cands else [ctx_w])
            
        # 2. Get candidates for the word being typed
        db_results = self.trie.fuzzy_search_prefix(current_word.lower(), max_cost=1.0, limit=limit)
        has_exact_match = any(r.get("cost", 1.0) == 0 for r in db_results) if db_results else False

        # If no exact match exists in the Trie (slang, typo, or OOV), query Google Input Tools
        google_results = []
        if not has_exact_match:
            google_cands = await fetch_google_candidates(current_word.lower(), limit=4)
            existing_tamil = {r["tamil"] for r in db_results}
            for cand in google_cands:
                if cand not in existing_tamil:
                    google_results.append({
                        "tanglish": current_word.lower(),
                        "tamil": cand,
                        "frequency": 15000,
                        "cost": 0.05
                    })
                    existing_tamil.add(cand)
        
        if db_results:
            if has_exact_match and len(db_results) > 2:
                dynamic_results = []
            else:
                dynamic_results = generate_dynamic_tamil_words(current_word.lower())
        else:
            # ── Layer 1.5: Morphological suffix-stripping ─────────────────
            dynamic_results = self.morph_engine.generate_morph_candidates(
                current_word.lower(), self.trie, limit=limit
            )
            # ── Layer 2: Raw phoneme decomposer (last resort) ─────────────
            if not dynamic_results and not google_results:
                dynamic_results = generate_dynamic_tamil_words(current_word.lower())
            
        combined_raw = google_results + db_results + dynamic_results
        combined_current = []
        seen_tamil = set()
        for item in combined_raw:
            tw = item.get("tamil")
            if tw and tw not in seen_tamil:
                seen_tamil.add(tw)
                combined_current.append(item)
        
        # 3. Rank combinations via sentence-level Deep Learning scoring
        suggestions = rank_combinations(combined_current, phrase.lower(), context_candidates, limit, session_cache=session_cache)

        return suggestions

    async def get_fuzzy_suggestions(self, phrase: str, limit: int = 10, session_cache: Dict = None) -> List[Dict]:
        """
        Fuzzy suggestion mode — uses a higher edit-distance tolerance.
        Delegates to get_suggestions() since the Trie already handles fuzzy
        matching via fuzzy_search_prefix(max_cost=1.0).
        """
        return await self.get_suggestions(phrase, limit, session_cache)