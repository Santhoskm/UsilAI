"""
Usil AI - Sentence Consistency Engine
Enforces Subject-Verb PNG (Person-Number-Gender) agreement and Tamil Sandhi Rules across resolved sentences.
"""

import re
from typing import List, Dict, Optional, Tuple

# ── 1. PNG MAPS ──────────────────────────────────────────────────────────────

SUBJECT_PNG_MAP = {
    # 1st Person Singular
    "நான்": "1S", "என்": "1S", "அடியேன்": "1S",
    # 1st Person Plural
    "நாம்": "1P", "நாங்கள்": "1P", "நாங்க": "1P", "நம்ம": "1P",
    # 2nd Person Singular
    "நீ": "2S", "நீயே": "2S",
    # 2nd Person Plural
    "நீங்கள்": "2P", "நீங்க": "2P", "நீர்": "2P",
    # 3rd Person Singular Masculine
    "அவன்": "3SM", "தம்பி": "3SM", "அண்ணன்": "3SM", "அப்பா": "3SM", "தந்தை": "3SM", "மகன்": "3SM", "அவன்டா": "3SM",
    # 3rd Person Singular Feminine
    "அவள்": "3SF", "அக்கா": "3SF", "அம்மா": "3SF", "தாய்": "3SF", "மகள்": "3SF", "அவா": "3SF", "அவ": "3SF",
    # 3rd Person Singular Honorific
    "அவர்": "3SH", "ஆசிரியர்": "3SH", "மருத்துவர்": "3SH", "தலைவர்": "3SH", "ஐயா": "3SH",
    # 3rd Person Plural Human
    "அவர்கள்": "3SP", "அவங்க": "3SP", "மக்கள்": "3SP", "மாணவர்கள்": "3SP", "நண்பர்கள்": "3SP", "பெண்கள்": "3SP", "ஆண்கள்": "3SP",
    # 3rd Person Singular Neuter
    "அது": "3SN", "இது": "3SN", "நாய்": "3SN", "பூனை": "3SN", "மரம்": "3SN", "பறவை": "3SN", "புத்தகம்": "3SN", "வண்டி": "3SN",
    # 3rd Person Plural Neuter
    "அவை": "3PN", "இவை": "3PN", "நாய்கள்": "3PN", "மரங்கள்": "3PN", "பறவைகள்": "3PN", "புத்தகங்கள்": "3PN",
}


def extract_subject_png(word: str) -> Optional[str]:
    """Returns the PNG category for a given subject word."""
    if not word:
        return None
    cleaned = word.strip()
    if cleaned in SUBJECT_PNG_MAP:
        return SUBJECT_PNG_MAP[cleaned]
    
    # Plural human suffix check (-கள்)
    if cleaned.endswith("கள்") and not cleaned.endswith("புத்தகங்கள்") and not cleaned.endswith("மரங்கள்"):
        return "3SP"
    
    return None


def extract_verb_png(word: str) -> Optional[str]:
    """Extracts Person-Number-Gender (PNG) category from verb endings."""
    if not word:
        return None
    w = word.strip()

    # 1S: -ேன் (வந்தேன், படிக்கிறேன், போகிறேன், செய்வேன்)
    if w.endswith("ேன்") or w.endswith("ென்"):
        return "1S"

    # 1P: -ோம் / -ோங்க (வந்தோம், படிக்கிறோம், செய்வோம்)
    if w.endswith("ோம்") or w.endswith("ோங்க"):
        return "1P"

    # 2S: -ாய் / -ா (வந்தாய், படிக்கிறாய், செய்வாய்)
    if w.endswith("ாய்"):
        return "2S"

    # 2P: -ீர்கள் / -ீங்க (வந்தீர்கள், வந்தீங்க, படிக்கிறீர்கள்)
    if w.endswith("ீர்கள்") or w.endswith("ீங்க"):
        return "2P"

    # 3SM: -ான் (வந்தான், படிக்கிறான், போகிறான், செய்வான்)
    if w.endswith("ான்") or w.endswith("ான்டா"):
        return "3SM"

    # 3SF: -ாள் (வந்தாள், படிக்கிறாள், போகிறாள், செய்வாள்)
    if w.endswith("ாள்"):
        return "3SF"

    # 3SH: -ார் (வந்தார், படிக்கிறார், போகிறார், செய்வார்)
    if w.endswith("ார்") and not w.endswith("ார்கள்"):
        return "3SH"

    # 3SP: -ார்கள் / -ாங்க (வந்தார்கள், வந்தாங்க, படிக்கிறார்கள்)
    if w.endswith("ார்கள்") or w.endswith("ாங்க"):
        return "3SP"

    # 3SN: -து / -ச்சு / -ந்தது (வந்தது, பறக்கிறது, போகிறது)
    if w.endswith("து") or w.endswith("ச்சு") or w.endswith("கிறது") or w.endswith("றது"):
        return "3SN"

    # 3PN: -ன / -ன்றன (வந்தன, பறக்கின்றன)
    if w.endswith("ன்றன") or w.endswith("த்தன") or w.endswith("ின"):
        return "3PN"

    return None


def check_subject_verb_agreement(subject_word: str, verb_word: str) -> Tuple[bool, float]:
    """
    Checks PNG agreement between subject and verb.
    Returns (is_matched: bool, score_delta: float).
    - Perfect Match: +2.5
    - Partial/Compatible (e.g. 3SH with 3SP): +1.0
    - Strong Mismatch (e.g. 1S 'நான்' with 3SM 'வந்தான்'): -3.5
    """
    s_png = extract_subject_png(subject_word)
    v_png = extract_verb_png(verb_word)

    if not s_png or not v_png:
        return True, 0.0  # Cannot determine, neutral

    if s_png == v_png:
        return True, 2.5

    # Compatible honorific/plural overlaps
    if s_png in ("3SM", "3SF", "3SH") and v_png == "3SH":
        return True, 1.5
    if s_png == "3SH" and v_png in ("3SM", "3SF", "3SP"):
        return True, 1.0
    if s_png == "3SP" and v_png == "3SH":
        return True, 1.0

    # Strong conflict (e.g., 1st person subject with 3rd person verb)
    return False, -3.5


# ── 2. SANDHI ENGINE ─────────────────────────────────────────────────────────

VALLINAM_MAP = {
    'க': 'க்', 'கா': 'க்', 'கி': 'க்', 'கீ': 'க்', 'கு': 'க்', 'கூ': 'க்', 'கெ': 'க்', 'கே': 'க்', 'கை': 'க்', 'கொ': 'க்', 'கோ': 'க்', 'கௌ': 'க்',
    'ச': 'ச்', 'சா': 'ச்', 'சி': 'ச்', 'சீ': 'ச்', 'சு': 'ச்', 'சூ': 'ச்', 'செ': 'ச்', 'சே': 'ச்', 'சை': 'ச்', 'சொ': 'ச்', 'சோ': 'ச்', 'சௌ': 'ச்',
    'த': 'த்', 'தா': 'த்', 'தி': 'த்', 'தீ': 'த்', 'து': 'த்', 'தூ': 'த்', 'தெ': 'த்', 'தே': 'த்', 'தை': 'த்', 'தொ': 'த்', 'தோ': 'த்', 'தௌ': 'த்',
    'ப': 'ப்', 'பா': 'ப்', 'பி': 'ப்', 'பீ': 'ப்', 'பு': 'ப்', 'பூ': 'ப்', 'பெ': 'ப்', 'பே': 'ப்', 'பை': 'ப்', 'பொ': 'ப்', 'போ': 'ப்', 'பௌ': 'ப்',
}


def get_first_letter(word: str) -> str:
    if not word:
        return ""
    # Tamil Unicode cluster check (base consonant + vowel sign)
    return word[0]


def apply_sandhi_between_words(word1: str, word2: str) -> Tuple[str, bool]:
    """
    Applies Vallinam doubling (வல்லினம் மிகுதல்) and Sandhi transformations between word1 and word2.
    Returns (modified_word1: str, changed: bool).
    """
    if not word1 or not word2:
        return word1, False

    w1 = word1.strip()
    w2 = word2.strip()

    first2 = get_first_letter(w2)
    vallinam_pulli = VALLINAM_MAP.get(first2, None)

    # 1. Accusative Case -ஐ (இரண்டாம் வேற்றுமை உருபு)
    # e.g., புத்தகத்தை + படித்தான் → புத்தகத்தைப் படித்தான்
    # e.g., அவனை + கேட்டான் → அவனைக் கேட்டான்
    if (w1.endswith("ை") or w1.endswith("த்தை")) and vallinam_pulli:
        if not w1.endswith(vallinam_pulli):
            return w1 + vallinam_pulli, True

    # 2. Dative Case -க்கு (நான்காம் வேற்றுமை உருபு)
    # e.g., வீட்டுக்கு + சென்றான் → வீட்டுக்குச் சென்றான்
    # e.g., ஊருக்கு + போனான் → ஊருக்குப் போனான்
    if (w1.endswith("க்கு") or w1.endswith("கிற்கு") or w1.endswith("ற்கு")) and vallinam_pulli:
        if not w1.endswith(vallinam_pulli):
            return w1 + vallinam_pulli, True

    # 3. Demonstration words (அந்த, இந்த, எந்த)
    # e.g., அந்த + பையன் → அந்தப் பையன்
    if w1 in ("அந்த", "இந்த", "எந்த") and vallinam_pulli:
        if not w1.endswith(vallinam_pulli):
            return w1 + vallinam_pulli, True

    # 4. Infinitive Verb ending in -அ (அகரம் ஈறு)
    # e.g., படிக்க + போனான் → படிக்கப் போனான்
    if (w1.endswith("க்க") or w1.endswith("வா")) and vallinam_pulli:
        if not w1.endswith(vallinam_pulli):
            return w1 + vallinam_pulli, True

    # 5. Locative / Directive suffixes (-படி, -வாறு, -முன்)
    if w1.endswith("படி") and vallinam_pulli:
        if not w1.endswith(vallinam_pulli):
            return w1 + vallinam_pulli, True

    return w1, False


def apply_sandhi_to_sentence(phrase: str) -> str:
    """
    Scans a multi-word Tamil sentence and applies Sandhi rules across word boundaries.
    """
    if not phrase or " " not in phrase:
        return phrase

    words = phrase.strip().split()
    if len(words) < 2:
        return phrase

    resolved_words = []
    for i in range(len(words) - 1):
        curr_w = words[i]
        next_w = words[i + 1]

        mod_w, changed = apply_sandhi_between_words(curr_w, next_w)
        resolved_words.append(mod_w)

    resolved_words.append(words[-1])
    return " ".join(resolved_words)


# ── 3. SENTENCE CONSISTENCY SCORE ───────────────────────────────────────────

def evaluate_sentence_consistency(words: List[str]) -> Tuple[float, str]:
    """
    Evaluates a full Tamil sentence array for PNG agreement & Sandhi consistency.
    Returns (total_score_delta: float, formatted_sentence: str).
    """
    if not words:
        return 0.0, ""

    total_delta = 0.0
    phrase = " ".join(words)

    # 1. Subject-Verb Agreement Evaluation
    subject_word = None
    for w in words:
        if extract_subject_png(w):
            subject_word = w
            break

    if subject_word:
        # Check against final verb word
        verb_word = words[-1]
        is_ok, png_delta = check_subject_verb_agreement(subject_word, verb_word)
        total_delta += png_delta

    # 2. Sandhi Rule Evaluation & Formatting
    formatted_sentence = apply_sandhi_to_sentence(phrase)
    if formatted_sentence != phrase:
        total_delta += 1.5  # Bonus for Sandhi correctness

    return total_delta, formatted_sentence
