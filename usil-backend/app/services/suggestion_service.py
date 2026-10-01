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
        """
        Generate candidates for the last word and context words, then rank combinations.
        
        Architecture Hierarchy:
        - Primary Driver (< 5 ms): In-memory Trie + MorphEngine + Syllable Word Former.
          Provides instant keystroke speeds, custom vocabulary, Sandhi rules, and zero API costs.
        - Auxiliary Fallback: Google Input Tools API.
          Triggered strictly when the local engine lacks confident candidates (e.g. rare slang,
          uncommon loanwords/brand names not yet present in the local database).
        """
        if not phrase:
            return []
            
        words = phrase.strip().split()
        if not words:
            return []
            
        current_word = words[-1]
        context_words = words[-3:-1]  # Up to 2 preceding words
        
        # 1. Get exact/near candidates for context words (100% local, fast, zero network overhead)
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
            
        # 2. Local Custom Engine (Primary Driver)
        # Layer 1: Trie Search (custom vocabulary, frequency-ranked)
        db_results = self.trie.fuzzy_search_prefix(current_word.lower(), max_cost=0.8, limit=limit)
        
        has_exact_match = any(r.get("cost", 1.0) == 0 for r in db_results) if db_results else False
        close_matches = [r for r in db_results if r.get("cost", 1.0) <= 0.4]
        
        # Layer 2: Morphological Engine (agglutinative grammar, suffixes, cases, verbs)
        morph_results = []
        if not has_exact_match:
            morph_results = self.morph_engine.generate_morph_candidates(
                current_word.lower(), self.trie, limit=limit
            )
            
        # Layer 3: Dynamic Syllable Word Former (phonetic synthesis, Sandhi, colloquial presets)
        dynamic_results = []
        if has_exact_match and len(db_results) >= 3:
            dynamic_raw = generate_dynamic_tamil_words(current_word.lower())
            dynamic_results = dynamic_raw[:2]
        else:
            dynamic_results = generate_dynamic_tamil_words(current_word.lower())

        # Determine if local custom engine has confident matches
        has_confident_local = bool(
            has_exact_match
            or morph_results
            or (close_matches and any(r.get("frequency", 0) > 1000 for r in close_matches))
            or any(d.get("source") == "preset" for d in dynamic_results)
        )

        # 3. Google Input Tools — Strictly Auxiliary Fallback
        # Automatically kicks in ONLY when local database lacks confident candidates (rare slang, brand names, OOV loanwords)
        google_results = []
        if not has_confident_local:
            google_cands = await fetch_google_candidates(current_word.lower(), limit=4)
            existing_tamil = {r["tamil"] for r in (db_results + morph_results + dynamic_results)}
            for cand in google_cands:
                if cand not in existing_tamil:
                    google_results.append({
                        "tanglish": current_word.lower(),
                        "tamil": cand,
                        "frequency": 8000,
                        "cost": 0.15,
                        "source": "google_auxiliary_fallback"
                    })
                    existing_tamil.add(cand)

        # Prioritize Custom Engine results as primary driver, with Google results as auxiliary fallback
        combined_raw = db_results + morph_results + dynamic_results + google_results
        combined_current = []
        seen_tamil = set()
        for item in combined_raw:
            tw = item.get("tamil")
            if tw and tw not in seen_tamil:
                seen_tamil.add(tw)
                combined_current.append(item)
        
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
        """
        Fuzzy suggestion mode — delegates to get_suggestions() since Trie
        already incorporates fuzzy search and auxiliary fallback.
        """
        return await self.get_suggestions(phrase, limit, session_cache)