import re
from typing import List, Dict

# ── High-frequency colloquial & pure Tamil presets ────────────────────────────
# Guarantees instant 100% correct transliteration for common conversational & formal words
_COLLOQUIAL_PRESETS: Dict[str, List[str]] = {
    "vanakkam": ["வணக்கம்", "வனக்கம்"],
    "nandri": ["நன்றி"],
    "thanni": ["தண்ணி"],
    "vanga": ["வாங்க", "வங்க"],
    "vaanga": ["வாங்க"],
    "pongo": ["போங்க"],
    "panren": ["பண்றேன்", "பன்றேன்"],
    "kudikren": ["குடிக்கிறேன்", "குடிகிறேன்"],
    "kudikiren": ["குடிக்கிறேன்", "குடிகிறேன்"],
    "irukanga": ["இருக்காங்க"],
    "innaiku": ["இன்னைக்கு", "இன்றைக்கு"],
    "naalaiku": ["நாளைக்கு"],
    "naliku": ["நாளைக்கு"],
    "kutty": ["குட்டி"],
    "dev": ["தேவ்", "தெவ்"],
    "deva": ["தேவா", "தெவா"],
    "devaa": ["தேவா"],
    "devi": ["தேவி"],
    "desam": ["தேசம்"],
    "deepam": ["தீபம்"],
    "deivam": ["தெய்வம்", "தேய்வம்"],
    "dosa": ["தோசை"],
    "dosai": ["தோசை"],
    "amma": ["அம்மா", "அம்ம"],
    "appa": ["அப்பா", "அப்ப"],
    "akkaa": ["அக்கா", "அக்க"],
    "akka": ["அக்கா", "அக்க"],
    "thambi": ["தம்பி"],
    "thangai": ["தங்கை"],
    "anna": ["அண்ணா", "அண்ண"],
    "ungal": ["உங்கள்"],
    "ungala": ["உங்களை"],
    "ungalu": ["உங்களுக்கு"],
    "ungakitta": ["உங்ககிட்ட"],
    "engal": ["எங்கள்"],
    "enga": ["எங்க"],
    "enna": ["என்ன"],
    "yenna": ["என்ன"],
    "eppo": ["எப்போ", "எப்பொழுது"],
    "eppadi": ["எப்படி"],
    "epdi": ["எப்படி"],
    "edhukku": ["எதுக்கு"],
    "ethukku": ["எதுக்கு"],
    "aama": ["ஆமா"],
    "aamanga": ["ஆமாங்க"],
    "illai": ["இல்லை"],
    "ille": ["இல்லை"],
    "illa": ["இல்ல"],
    "irukku": ["இருக்கு"],
    "irukken": ["இருக்கேன்"],
    "neram": ["நேரம்", "நெரம்"],
    "velai": ["வேலை", "வெலை"],
    "kaalai": ["காலை"],
    "maalai": ["மாலை"],
    "padippu": ["படிப்பு"],
    "tamil": ["தமிழ்", "தமில்"],
    "thamizh": ["தமிழ்"],
    "varaverpalar": ["வரவேற்பாளர்", "வரவேற்பாலர்"],
    "pogum": ["போகும்", "பொகும்"],
    "pogiren": ["போகிறேன்"],
    "pogiran": ["போகிறான்"],
    "pogiral": ["போகிறாள்"],
    "varugiren": ["வருகிறேன்"],
    "varugiran": ["வருகிறான்"],
    "varugiral": ["வருகிறாள்"],
    "padikka": ["படிக்க"],
    "padikiren": ["படிக்கிறேன்"],
    "padithal": ["படித்தாள்"],
    "padithan": ["படித்தான்"],
    "saapidugiren": ["சாப்பிடுகிறேன்"],
    "saappittom": ["சாப்பிட்டோம்"],
    "vandhaargal": ["வந்தார்கள்"],
    "sendran": ["சென்றான்"],
    "kalvi": ["கல்வி"],
    "magizhchi": ["மகிழ்ச்சி"],
    "aaraychi": ["ஆராய்ச்சி"],
    "muyarchi": ["முயற்சி"],
    "pusthakam": ["புத்தகம்"],
    "thanneer": ["தண்ணீர்"],
    "vaazhthukkal": ["வாழ்த்துக்கள்", "வாழ்த்துகள்"],
    "kalloori": ["கல்லூரி"],
}

# ── Standalone independent vowels (Uyir) vs vowel sign mapping (Uyirmei) ─────
VOWEL_SIGN_TO_LETTER = {
    'ா': 'ஆ', 'ி': 'இ', 'ீ': 'ஈ', 'ு': 'உ', 'ூ': 'ஊ',
    'ெ': 'எ', 'ே': 'ஏ', 'ை': 'ஐ', 'ொ': 'ஒ', 'ோ': 'ஓ', 'ௌ': 'ஔ'
}

def _build_token_table():
    """Builds greedy longest-match phonetic token mapping."""
    t = []
    
    # 1. Special multi-character clusters
    t.append(('ndai', 'ண்டை'))
    t.append(('ndu', 'ண்டு'))
    t.append(('nda', 'ண்ட'))
    t.append(('ndam', 'ண்டம்'))
    t.append(('ndru', 'ன்று'))
    t.append(('ndra', 'ன்ற'))
    t.append(('ndri', 'ன்றி'))
    t.append(('ndren', 'ன்றேன்'))
    t.append(('ndran', 'ன்றான்'))
    t.append(('ndral', 'ன்றாள்'))
    t.append(('ndrom', 'ன்றோம்'))
    t.append(('ndrargal', 'ன்றார்கள்'))
    
    t.append(('srii', 'ஸ்ரீ'))
    t.append(('sri', 'ஸ்ரீ'))
    t.append(('shri', 'ஸ்ரீ'))
    t.append(('shree', 'ஸ்ரீ'))
    t.append(('stree', 'ஸ்த்ரீ'))
    t.append(('stra', 'ஸ்ட்ர'))
    t.append(('unthan', 'உந்தன்'))
    t.append(('zhch', 'ழ்ச்ச'))
    t.append(('zhchi', 'ழ்ச்சி'))
    t.append(('rch', 'ர்ச்சி'))
    t.append(('rchi', 'ர்ச்சி'))
    t.append(('yarch', 'யற்சி'))
    t.append(('yarchi', 'யற்சி'))

    def add_family(roman: str, base_tamil: str):
        # Long vowels first
        t.append((roman + 'aa', base_tamil + 'ா'))
        t.append((roman + 'ii', base_tamil + 'ீ'))
        t.append((roman + 'uu', base_tamil + 'ூ'))
        t.append((roman + 'ee', base_tamil + 'ீ'))
        t.append((roman + 'oo', base_tamil + 'ூ'))
        t.append((roman + 'ae', base_tamil + 'ே'))
        t.append((roman + 'ea', base_tamil + 'ே'))
        t.append((roman + 'oa', base_tamil + 'ோ'))
        t.append((roman + 'ow', base_tamil + 'ௌ'))
        t.append((roman + 'ai', base_tamil + 'ை'))
        t.append((roman + 'au', base_tamil + 'ௌ'))
        t.append((roman + 'A', base_tamil + 'ா'))
        t.append((roman + 'I', base_tamil + 'ீ'))
        t.append((roman + 'U', base_tamil + 'ூ'))
        t.append((roman + 'E', base_tamil + 'ே'))
        t.append((roman + 'O', base_tamil + 'ோ'))
        # Short vowels
        t.append((roman + 'a', base_tamil))
        t.append((roman + 'i', base_tamil + 'ி'))
        t.append((roman + 'u', base_tamil + 'ு'))
        t.append((roman + 'e', base_tamil + 'ெ'))
        t.append((roman + 'o', base_tamil + 'ொ'))
        # Bare consonant with pulli
        t.append((roman, base_tamil + '்'))

    # Multi-letter consonant clusters
    add_family('tr', 'ற்ற')
    add_family('nth', 'ந்த')
    add_family('ndh', 'ந்த')
    add_family('ksh', 'க்ஷ')
    add_family('sth', 'ஸ்த')
    add_family('nd', 'ண்ட')
    add_family('nt', 'ண்ட')
    add_family('nk', 'ங்க')
    add_family('ng', 'ங்க')
    add_family('mb', 'ம்ப')
    add_family('nb', 'ண்ப')
    add_family('nch', 'ஞ்ச')
    add_family('nc', 'ஞ்ச')
    add_family('nn', 'ன்ன')
    add_family('sch', 'ஸ்க')
    add_family('ll', 'ல்ல')
    add_family('LL', 'ள்ள')
    add_family('sh', 'ஷ')
    add_family('ddh', 'த்த')
    add_family('tth', 'த்த')
    add_family('dh', 'த')
    add_family('th', 'த')
    add_family('bh', 'ப')
    add_family('gh', 'க')
    add_family('ch', 'ச')
    add_family('zh', 'ழ')
    add_family('nj', 'ஞ')
    add_family('kk', 'க்க')
    add_family('pp', 'ப்ப')
    add_family('tt', 'ட்ட')
    add_family('dd', 'ட்ட')
    add_family('mm', 'ம்ம')

    # Single consonants
    add_family('k', 'க')
    add_family('g', 'க')
    add_family('p', 'ப')
    add_family('b', 'ப')
    add_family('m', 'ம')
    add_family('y', 'ய')
    add_family('r', 'ர')
    add_family('l', 'ல')
    add_family('v', 'வ')
    add_family('w', 'வ')
    add_family('h', 'ஹ')
    add_family('s', 'ச')
    add_family('t', 'த')
    add_family('d', 'ட')
    add_family('T', 'ட')
    add_family('D', 'ட')
    add_family('j', 'ஜ')
    add_family('n', 'ன')
    add_family('N', 'ண')
    add_family('L', 'ள')
    add_family('R', 'ற')
    add_family('z', 'ழ')
    add_family('f', 'ஃப')

    # Independent vowels (Standalone at start of word or after vowel)
    t.append(('aa', 'ஆ'))
    t.append(('ii', 'ஈ'))
    t.append(('uu', 'ஊ'))
    t.append(('ee', 'ஈ'))
    t.append(('oo', 'ஊ'))
    t.append(('ae', 'ஏ'))
    t.append(('ea', 'ஏ'))
    t.append(('oa', 'ஓ'))
    t.append(('ai', 'ஐ'))
    t.append(('au', 'ஔ'))
    t.append(('ow', 'ஔ'))
    t.append(('A', 'ஆ'))
    t.append(('I', 'ஈ'))
    t.append(('U', 'ஊ'))
    t.append(('E', 'ஏ'))
    t.append(('O', 'ஓ'))
    t.append(('a', 'அ'))
    t.append(('i', 'இ'))
    t.append(('u', 'உ'))
    t.append(('e', 'எ'))
    t.append(('o', 'ஒ'))

    # Sort descending by key length for greedy match
    t.sort(key=lambda x: len(x[0]), reverse=True)
    return t

_TOKEN_TABLE = _build_token_table()
_TOKEN_BUCKETS: Dict[str, list] = {}
for _k, _v in _TOKEN_TABLE:
    _c = _k[0]
    _TOKEN_BUCKETS.setdefault(_c, []).append((_k, _v))


class SyllableSegmentFormer:
    """
    High-accuracy, high-speed Tamil phonetic word formation engine.
    Produces valid Tamil words with correct uyir, uyirmei, pulli, and sandhi rules.
    """
    def __init__(self):
        self.token_buckets = _TOKEN_BUCKETS

    def transliterate_base(self, tanglish: str) -> str:
        """Transliterates a Tanglish string using longest-match segment tokenization."""
        if not tanglish:
            return ""
        inp = tanglish.lower().strip()

        # Word-initial dental 't' and 'd' rewrite (e.g. tamil -> தமிழ், thambi -> தம்பி, dev -> தேவ், deepam -> தீபம்)
        if re.match(r'^[td][aeiou]', inp) and not inp.startswith(('th', 'dh', 'tr', 'tt', 'dd')):
            if inp.startswith('t'):
                inp = 'th' + inp[1:]
            elif inp.startswith('d'):
                inp = 'dh' + inp[1:]

        pos = 0
        res = []
        n = len(inp)
        while pos < n:
            c = inp[pos]
            bucket = self.token_buckets.get(c, [])
            matched = False
            for k, v in bucket:
                if inp.startswith(k, pos):
                    res.append(v)
                    pos += len(k)
                    matched = True
                    break
            if not matched:
                res.append(inp[pos])
                pos += 1

        out = "".join(res)

        # ── 1. Fix orphan vowel sign at start of word ───────────────────────────
        if out and out[0] in VOWEL_SIGN_TO_LETTER:
            out = VOWEL_SIGN_TO_LETTER[out[0]] + out[1:]

        # ── 2. Fix invalid word-initial Tamil consonants ────────────────────────
        # In Tamil: ன, ற, ள, ண cannot begin a word; replace with valid initial letters
        if out:
            if out[0] == 'ன':
                out = 'ந' + out[1:]
            elif out[0] == 'ற':
                out = 'ர' + out[1:]
            elif out[0] == 'ள':
                out = 'ல' + out[1:]
            elif out[0] == 'ண':
                out = 'ந' + out[1:]

        # ── 3. Clean up pulli followed by vowel signs ───────────────────────────
        out = (out.replace('்ா', 'ா').replace('்ி', 'ி').replace('்ீ', 'ீ')
                  .replace('்ு', 'ு').replace('்ூ', 'ூ').replace('்ெ', 'ெ')
                  .replace('்ே', 'ே').replace('்ை', 'ை').replace('்ொ', 'ொ')
                  .replace('்ோ', 'ோ').replace('்ௌ', 'ௌ'))

        return out

    def generate(self, tanglish_query: str, max_candidates: int = 10) -> List[Dict]:
        """
        Generates ranked candidate Tamil words from phonetic input.
        """
        if not tanglish_query:
            return []

        clean_query = tanglish_query.lower().strip()

        # ── 1. Check colloquial high-precision presets first ───────────────────
        if clean_query in _COLLOQUIAL_PRESETS:
            preset_words = _COLLOQUIAL_PRESETS[clean_query]
            results = []
            for i, tw in enumerate(preset_words):
                results.append({
                    "tanglish": clean_query,
                    "tamil": tw,
                    "frequency": 25000 - (i * 1000),
                    "cost": 0.05 * i,
                    "source": "preset"
                })
            return results[:max_candidates]

        # ── 2. Run segment transliteration ────────────────────────────────────
        base = self.transliterate_base(clean_query)
        if not base:
            return []

        cands = [base]

        # ── 3. Generate linguistically valid colloquial variants ───────────────
        # (a) Long-e / Short-e variation (Tanglish 'e' often denotes long 'ே' e.g. neram -> நேரம்)
        if 'ெ' in base:
            cands.append(base.replace('ெ', 'ே'))
        elif 'ே' in base:
            cands.append(base.replace('ே', 'ெ'))

        # (b) Long-o / Short-o variation (Tanglish 'o' often denotes long 'ோ' e.g. pogum -> போகும்)
        if 'ொ' in base:
            cands.append(base.replace('ொ', 'ோ'))
        elif 'ோ' in base:
            cands.append(base.replace('ோ', 'ொ'))

        # (c) Word-final open 'a' often represents long 'ா' (e.g. amma -> அம்மா, appa -> அப்பா)
        if clean_query.endswith(('a', 'aa')) and not base.endswith(('ா', 'ை', 'ி', 'ீ', 'ு', 'ூ', '்')):
            cands.append(base + 'ா')

        # (d) Ambiguous L sounds: ல ↔ ள ↔ ழ
        if 'ல' in base:
            cands.append(base.replace('ல', 'ள'))
            cands.append(base.replace('ல', 'ழ'))
        if 'ல்' in base:
            cands.append(base.replace('ல்', 'ள்'))
            cands.append(base.replace('ல்', 'ழ்'))

        # (e) Ambiguous N sounds: ன ↔ ண
        if 'ன' in base[1:]:  # don't replace word-initial letter
            cands.append(base[:1] + base[1:].replace('ன', 'ண'))
        if 'ன்' in base:
            cands.append(base.replace('ன்', 'ண்'))

        # (f) Ambiguous R sounds: ர ↔ ற
        if 'ர' in base[1:]:
            cands.append(base[:1] + base[1:].replace('ர', 'ற'))

        # (g) Intervocalic single k/p gemination: க -> க்க, ப -> ப்ப
        if 'க' in base and 'க்க' not in base:
            cands.append(base.replace('க', 'க்க', 1))
        if 'ப' in base and 'ப்ப' not in base:
            cands.append(base.replace('ப', 'ப்ப', 1))

        # ── 4. Deduplicate and format candidate list ──────────────────────────
        seen = set()
        results = []
        for i, word in enumerate(cands):
            if word and word not in seen:
                seen.add(word)
                results.append({
                    "tanglish": clean_query,
                    "tamil": word,
                    "frequency": max(500, 5000 - (i * 500)),
                    "cost": 0.40 + (i * 0.1),
                    "source": "phonetic"
                })
                if len(results) >= max_candidates:
                    break

        return results


# Global singleton instance for high performance
_former = SyllableSegmentFormer()

def generate_dynamic_tamil_words(tanglish_query: str) -> List[Dict]:
    """
    Public entry point for dynamic Tamil word formation.
    Called by SuggestionService when Trie / DB lookup requires phonetic candidates.
    """
    return _former.generate(tanglish_query)
