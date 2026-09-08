import itertools
import re

class Layer2SyllableFormer:
    def __init__(self):
        # Master dictionary: Maps Tanglish phonetic sounds to Tamil character candidates
        self.PHONETIC_MAP = {
            # -------------------------------------------------------------
            # 1. SPECIAL COLLOQUIAL SYLLABLES & SUFFIXES (Greedy High Match)
            # -------------------------------------------------------------
            "vanga": ["வாங்க", "வங்க", "வாங்கா"],
            "vaanga": ["வாங்க"],
            "ppan": ["ப்பான்", "ப்பன்"],
            "ppaan": ["ப்பான்"],
            "nga": ["ங்", "ங", "ங்கா"],
            "ngan": ["ங்கன்", "ஙன்"],
            "padi": ["படி"],
            "padippan": ["படிப்பான்", "படிபான்"],
            "dhaan": ["தான்"],
            "than": ["தன்", "தான்"],
            
            # -------------------------------------------------------------
            # 2. VOWELS (Standalone / Word Initial)
            # -------------------------------------------------------------
            "a": ["ா", "அ", "ஆ"],
            "aa": ["ா", "ஆ"],
            "i": ["ி", "இ", "ீ", "ஈ"],
            "ee": ["ீ", "ஈ", "ி", "இ"],
            "ii": ["ீ", "ஈ"],
            "u": ["ு", "உ", "ூ", "ஊ"],
            "oo": ["ூ", "ஊ", "ு", "உ"],
            "uu": ["ூ", "ஊ"],
            "e": ["ே", "ெ", "எ", "ஏ"],
            "ea": ["ே", "ஏ"],
            "ae": ["ே", "ஏ"],
            "ai": ["ை", "ஐ"],
            "o": ["ொ", "ஒ", "ோ", "ஓ"],
            "oa": ["ோ", "ஓ"],
            "au": ["ௌ", "ஔ"],
            "av": ["ௌ", "ஔ"],

            # -------------------------------------------------------------
            # 3. GRANTHA CONSONANTS (Sanskrit/English Loan Sounds)
            # -------------------------------------------------------------
            "ja": ["ஜ", "ஜா"], "j": ["ஜ்"],
            "sha": ["ஷ", "ஷா", "ஶ"], "sh": ["ஷ்"],
            "sa": ["ஸ", "ஸா"], "s": ["ஸ்"],
            "ha": ["ஹ", "ஹா"], "h": ["ஹ்"],
            "sri": ["ஸ்ரீ"], "shree": ["ஸ்ரீ"],
            "ksh": ["க்ஷ்"], "ksha": ["க்ஷ"],

            # -------------------------------------------------------------
            # 4. AMBIGUOUS MULTIPLE-CHOICE CONSONANTS (Lazy Typing Support)
            # -------------------------------------------------------------
            # L / LL / ZH variations
            "la": ["ல", "லா", "ள", "ளா", "ழ", "ழா"], 
            "l": ["ல்", "ள்", "ழ்"],
            "lla": ["ள்ள", "ல்ல", "ள", "ளா"], 
            "ll": ["ள்", "ல்"],
            "zha": ["ழ", "ழா"], 
            "zh": ["ழ்"],

            # N variations
            "na": ["ந", "நா", "ன", "னா", "ண", "ணா"],
            "n": ["ன்", "ந்", "ண்", "ங்"],
            "nna": ["ண்ண", "ன்ன"], 
            "nn": ["ண்", "ன்"],
            "ntha": ["ந்த"], 
            "nka": ["ங்க"],

            # R variations
            "ra": ["ர", "ற", "ரா", "றா"], 
            "r": ["ர்", "ற்", "ர", "ற"], 
            "rra": ["ற்ற", "ர்ர"], 
            "rr": ["ற்", "ர்"],

            # T / D variations
            "ta": ["த", "தா", "ட", "டா"], "da": ["த", "தா", "ட", "டா"],
            "tha": ["த", "தா"], "th": ["த்"], 
            "t": ["த்", "ட்"], "d": ["ட்", "த்"],
            "tta": ["ட்ட"], "ttha": ["த்த"],

            # -------------------------------------------------------------
            # 5. STANDARD CONSONANTS
            # -------------------------------------------------------------
            "ka": ["க", "கா"], "ga": ["க", "கா"], "k": ["க்"], "g": ["க்"],
            "kka": ["க்க"], "kki": ["க்கி"],

            "cha": ["ச", "சா"], "ca": ["ச", "சா"], "ch": ["ச்"],
            "c": ["ச்"], "ccha": ["ச்ச"],

            "pa": ["ப", "பா"], "ba": ["ப", "பா"], "p": ["ப்"], "b": ["ப்"],
            "ppa": ["ப்ப"], "bba": ["ப்ப"],

            "ma": ["ம", "மா"], "m": ["ம்"], "mma": ["ம்ம"],
            "ya": ["ய", "யா"], "y": ["ய்"],
            "va": ["வ", "வா"], "v": ["வ்"], "vva": ["வ்வ"],

            # -------------------------------------------------------------
            # 6. MISSING LETTERS ADDED
            # -------------------------------------------------------------
            "w": ["வ்"], "wa": ["வ", "வா"],
            "f": ["ஃப்", "ப்"], "fa": ["ஃப", "ப", "பா"],
            "z": ["ஜ்", "ஸ்"], "za": ["ஜ", "ஜா", "ஸ", "ஸா"],
            "x": ["க்ஸ்"], "xa": ["க்ஸ"],
            "q": ["க்"], "qu": ["க்யு"],
        }
        
        # Compile a greedy regex pattern to evaluate longest matches first
        sorted_keys = sorted(self.PHONETIC_MAP.keys(), key=len, reverse=True)
        self.tokenizer_regex = re.compile("|".join(sorted_keys))

    def _tokenize(self, text: str) -> list[str]:
        """Splits incoming Tanglish into token fragments greedily."""
        tokens = []
        pos = 0
        text = text.lower().strip()
        
        while pos < len(text):
            match = self.tokenizer_regex.match(text, pos)
            if match:
                tokens.append(match.group(0))
                pos = match.end()
            else:
                tokens.append(text[pos])
                pos += 1
                
        return tokens

    def generate(self, tanglish_query: str, max_candidates: int = 50) -> list[dict]:
        """
        Tokenizes query, looks up Tamil options, and builds combinations via Cartesian product.
        """
        if not tanglish_query:
            return []

        tokens = self._tokenize(tanglish_query)
        
        # Retrieve candidate options with their priority index
        syllable_options = []
        for tok in tokens:
            options = self.PHONETIC_MAP.get(tok, [tok])
            syllable_options.append([(i, opt) for i, opt in enumerate(options)])

        # Generate Cartesian combinations
        raw_combinations = list(itertools.product(*syllable_options))
        
        # Sort combinations by the sum of their indices (lower sum = more common phonemes)
        # We limit the raw sorting to 10000 combinations to prevent memory spikes on crazy words
        raw_combinations = raw_combinations[:10000]
        raw_combinations.sort(key=lambda combo: sum(idx for idx, _ in combo))
        
        results = []
        seen = set()
        
        for combo in raw_combinations:
            word = "".join([opt for _, opt in combo])
            
            # Fix invalid consonant+vowel combinations (remove pulli when followed by a vowel marker or independent vowel)
            word = word.replace("்ா", "ா").replace("்ி", "ி").replace("்ீ", "ீ").replace("்ு", "ு").replace("்ூ", "ூ")
            word = word.replace("்ெ", "ெ").replace("்ே", "ே").replace("்ை", "ை").replace("்ொ", "ொ").replace("்ோ", "ோ").replace("்ௌ", "ௌ")
            
            # Convert standalone vowels immediately following a consonant (pulli) into dependent markers
            word = word.replace("்அ", "").replace("்ஆ", "ா").replace("்இ", "ி").replace("்ஈ", "ீ")
            word = word.replace("்உ", "ு").replace("்ஊ", "ூ").replace("்எ", "ெ").replace("்ஏ", "ே")
            word = word.replace("்ஐ", "ை").replace("்ஒ", "ொ").replace("்ஓ", "ோ").replace("்ஔ", "ௌ")
            
            if word not in seen:
                seen.add(word)
                results.append({
                    "tanglish": tanglish_query,
                    "tamil": word,
                    "frequency": 0  # Dynamic Layer 2 candidate
                })
                
            # Allow up to max_candidates dynamic combinations to feed the AI model
            if len(results) >= max_candidates:
                break
                
        return results


# -------------------------------------------------------------
# GLOBAL WRAPPER FOR SUGGESTION SERVICE
# -------------------------------------------------------------
# We create one global instance so it compiles the regex only ONCE at startup (very fast)
_former = Layer2SyllableFormer()

def generate_dynamic_tamil_words(tanglish_query: str) -> list[dict]:
    """
    This function acts as the bridge so suggestion_service.py 
    can call it easily just like before.
    """
    return _former.generate(tanglish_query)
