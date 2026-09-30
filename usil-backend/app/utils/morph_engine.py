"""
Usil AI 2.0 — Morphological Engine
====================================
Strips known Tanglish verb/noun suffixes from an unknown word to expose its root,
then re-applies the correct Tamil suffix after the root is looked up in the Trie.

Pipeline position (called by SuggestionService when Trie returns no results):
    Trie hit  → use results directly
    Trie miss → MorphEngine.strip_suffix(tanglish_word)
              → root hit in Trie → conjugate(root_tamil, suffix_tag) → candidate
              → root still miss  → Layer2SyllableFormer (last resort)
"""

from typing import Optional, Tuple, List, Dict


# ─────────────────────────────────────────────────────────────────────────────
# 1. SUFFIX TABLE
#    Ordered longest-match first so "girargal" is tried before "giran".
#    Each entry: (tanglish_suffix, tamil_suffix, suffix_tag)
# ─────────────────────────────────────────────────────────────────────────────

SUFFIX_TABLE: List[Tuple[str, str, str]] = [
    # ── Present tense (கிற-) ──────────────────────────────────────────────
    ("girargal",  "கிறார்கள்", "PRES_3SP"),
    ("girirkal",  "கிறார்கள்", "PRES_3SP"),
    ("giraangal", "கிறாங்கள்", "PRES_3SP"),
    ("giringa",   "கிறீங்க",   "PRES_2PH"),
    ("girathu",   "கிறது",     "PRES_3SN"),
    ("kirathu",   "கிறது",     "PRES_3SN"),
    ("girodm",    "கிறோம்",    "PRES_1P"),
    ("girom",     "கிறோம்",    "PRES_1P"),
    ("girar",     "கிறார்",    "PRES_3SH"),
    ("girraar",   "கிறார்",    "PRES_3SH"),
    ("giraal",    "கிறாள்",    "PRES_3SF"),
    ("girraal",   "கிறாள்",    "PRES_3SF"),
    ("giran",     "கிறான்",    "PRES_3SM"),
    ("girran",    "கிறான்",    "PRES_3SM"),
    ("giren",     "கிறேன்",    "PRES_1S"),
    ("girren",    "கிறேன்",    "PRES_1S"),
    ("kiren",     "கிறேன்",    "PRES_1S"),
    ("kiran",     "கிறான்",    "PRES_3SM"),
    ("kiral",     "கிறாள்",    "PRES_3SF"),
    ("kirar",     "கிறார்",    "PRES_3SH"),
    ("kirom",     "கிறோம்",    "PRES_1P"),
    ("kirathu",   "கிறது",     "PRES_3SN"),

    # ── Past tense (-த்தான், -ட்டான், -ந்தான் families) ───────────────────
    ("ttaargal",  "ட்டார்கள்", "PAST_3SP"),
    ("ttoom",     "ட்டோம்",    "PAST_1P"),
    ("ttom",      "ட்டோம்",    "PAST_1P"),
    ("ttaar",     "ட்டார்",    "PAST_3SH"),
    ("ttaal",     "ட்டாள்",    "PAST_3SF"),
    ("ttaan",     "ட்டான்",    "PAST_3SM"),
    ("tten",      "ட்டேன்",    "PAST_1S"),
    ("tthaal",    "த்தாள்",    "PAST_3SF"),
    ("tthaan",    "த்தான்",    "PAST_3SM"),
    ("tthen",     "த்தேன்",    "PAST_1S"),
    ("nthaargal", "ந்தார்கள்", "PAST_3SP"),
    ("nthaar",    "ந்தார்",    "PAST_3SH"),
    ("nthaal",    "ந்தாள்",    "PAST_3SF"),
    ("nthaan",    "ந்தான்",    "PAST_3SM"),
    ("nthen",     "ந்தேன்",    "PAST_1S"),
    ("nthom",     "ந்தோம்",    "PAST_1P"),
    ("ndhaargal", "ந்தார்கள்", "PAST_3SP"),
    ("ndhaar",    "ந்தார்",    "PAST_3SH"),
    ("ndhaal",    "ந்தாள்",    "PAST_3SF"),
    ("ndhaan",    "ந்தான்",    "PAST_3SM"),
    ("ndhen",     "ந்தேன்",    "PAST_1S"),
    ("ndhom",     "ந்தோம்",    "PAST_1P"),

    # ── Colloquial past (-னான், -னாள், -றான்) ────────────────────────────
    ("naargal",   "னார்கள்",   "PAST_3SP"),
    ("naar",      "னார்",      "PAST_3SH"),
    ("naal",      "னாள்",      "PAST_3SF"),
    ("naan",      "னான்",      "PAST_3SM"),
    ("nen",       "னேன்",      "PAST_1S"),
    ("nom",       "னோம்",      "PAST_1P"),

    # ── Future tense (-வேன், -வான்) ───────────────────────────────────────
    ("vaargal",   "வார்கள்",   "FUT_3SP"),
    ("vaar",      "வார்",      "FUT_3SH"),
    ("vaal",      "வாள்",      "FUT_3SF"),
    ("vaan",      "வான்",      "FUT_3SM"),
    ("ven",       "வேன்",      "FUT_1S"),
    ("vom",       "வோம்",      "FUT_1P"),
    ("vum",       "வும்",      "FUT_3SN"),

    # ── Infinitive / verbal noun suffixes ─────────────────────────────────
    ("kka",       "க்க",       "INF"),
    ("gga",       "க்க",       "INF"),
    ("ppan",      "ப்பான்",    "FUT_3SM"),

    # ── Noun case suffixes ────────────────────────────────────────────────
    ("kku",       "க்கு",      "DAT"),
    ("il",        "இல்",       "LOC"),
    ("ula",       "உல",        "LOC_COL"),
    ("ai",        "ஐ",         "ACC"),
    ("odu",       "உடன்",      "COM"),
    ("aal",       "ஆல்",       "INS"),
    ("ukku",      "உக்கு",     "DAT"),
    ("kkal",      "க்கள்",     "PLU"),
    ("kal",       "கள்",       "PLU"),
    ("gal",       "கள்",       "PLU"),
]

# ── Root-substitution table for irregular Tanglish verb stems ──────────────
# When the stripped Tanglish root doesn't directly hit the Trie,
# try these canonical root aliases before giving up.
IRREGULAR_ROOT_MAP: Dict[str, str] = {
    # போ (go) — all colloquial present-tense stems
    "pogi":   "po",
    "pogi":   "po",
    "po":     "po",
    # வா (come) — present tense "varu" stems
    "varu":   "va",
    "varugi": "va",
    # செல் (go, formal) — past "sendra/sendran" stems
    "sendra": "sel",
    "sendr":  "sel",
    # படி (study)
    "padig":  "padi",
    "padik":  "padi",
    # சாப்பிடு (eat) — common shortened stems
    "saappit": "saappidu",
    "saappi":  "saappidu",
    "sappi":   "saappidu",
    # பாடு (sing)
    "paadugi": "paadu",
    "paadu":   "paadu",
    # அடை (reach)
    "adaigi":  "adai",
    "adaint":  "adai",
}


# ─────────────────────────────────────────────────────────────────────────────
# 2. SUFFIX-STRIPPING ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class MorphEngine:
    """
    Morphological analyser for Tanglish input.

    Usage:
        engine = MorphEngine()
        root, tamil_suffix, tag = engine.strip_suffix("varugiran")
        # root="varu", tamil_suffix="கிறான்", tag="PRES_3SM"
        # Then look up "varu" in the Trie → "வரு" / "வா"
        # Then call engine.build_candidate(root_tamil, tamil_suffix)
        #   → "வருகிறான்"
    """

    def __init__(self):
        # Sort by suffix length descending — longest match wins
        self._table = sorted(SUFFIX_TABLE, key=lambda x: len(x[0]), reverse=True)

    def strip_suffix(self, tanglish_word: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Try to strip a known suffix from the Tanglish word.

        Returns:
            (root_tanglish, tamil_suffix, tag)  if a suffix was found
            (None, None, None)                   if no suffix matched
        """
        word = tanglish_word.lower().strip()
        # Minimum root length guard — roots shorter than 2 chars are unreliable
        MIN_ROOT = 2

        for tanglish_sfx, tamil_sfx, tag in self._table:
            if word.endswith(tanglish_sfx) and len(word) - len(tanglish_sfx) >= MIN_ROOT:
                root = word[: len(word) - len(tanglish_sfx)]
                # Try irregular root remapping
                canonical_root = IRREGULAR_ROOT_MAP.get(root, root)
                return canonical_root, tamil_sfx, tag

        return None, None, None

    def build_candidate(self, root_tamil: str, tamil_suffix: str) -> str:
        """
        Concatenate a Tamil root with a suffix, applying the pulli-drop rule:
        if the root ends with ் (pulli) and the suffix starts with a vowel sign,
        the pulli is consumed.
        """
        if not root_tamil or not tamil_suffix:
            return root_tamil or tamil_suffix or ""

        result = root_tamil + tamil_suffix

        # Pulli + vowel-sign → drop the pulli (e.g., வரு் + கிறான் → வருகிறான்)
        result = result.replace("்க", "க").replace("்ச", "ச").replace("்த", "த")
        result = result.replace("்ப", "ப").replace("்ம", "ம").replace("்ன", "ன")
        result = result.replace("்வ", "வ").replace("்ய", "ய").replace("்ர", "ர")
        result = result.replace("்ண", "ண").replace("்ல", "ல").replace("்ள", "ள")
        result = result.replace("்ழ", "ழ").replace("்ற", "ற").replace("்ட", "ட")

        return result

    def generate_morph_candidates(
        self,
        tanglish_word: str,
        trie,
        limit: int = 5,
    ) -> List[Dict]:
        """
        Main entry point called by SuggestionService.

        Steps:
        1. Strip suffix from tanglish_word.
        2. Search root in Trie (exact, then fuzzy).
        3. For each Trie root hit, build a full Tamil candidate via build_candidate().
        4. Return list of candidate dicts (same schema as Trie results).

        Returns [] if no suffix could be stripped or no root was found.
        """
        root, tamil_suffix, tag = self.strip_suffix(tanglish_word)
        if root is None:
            return []

        # 1. Try exact prefix search first (cost=0)
        root_results = trie.search_prefix(root, limit=limit)

        # 2. Fall back to fuzzy if nothing found
        if not root_results:
            root_results = trie.fuzzy_search_prefix(root, max_cost=0.5, limit=limit)

        if not root_results:
            return []

        # 3. Build full Tamil candidates
        candidates = []
        seen_tamil = set()
        for root_hit in root_results:
            full_tamil = self.build_candidate(root_hit["tamil"], tamil_suffix)
            if full_tamil in seen_tamil:
                continue
            seen_tamil.add(full_tamil)
            candidates.append({
                "tanglish":  tanglish_word,
                "tamil":     full_tamil,
                "frequency": root_hit.get("frequency", 0),
                "cost":      root_hit.get("cost", 0.5),  # slight penalty vs direct hit
                "source":    "morph",
            })

        return candidates[:limit]


# ── Module-level singleton ────────────────────────────────────────────────────
_morph_engine: Optional[MorphEngine] = None


def get_morph_engine() -> MorphEngine:
    """Return the module-level MorphEngine singleton (lazy-initialised)."""
    global _morph_engine
    if _morph_engine is None:
        _morph_engine = MorphEngine()
    return _morph_engine
