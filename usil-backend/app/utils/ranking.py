from typing import List, Dict

def rank_suggestions(suggestions: List[Dict], query: str) -> List[Dict]:
    """
    Re-rank suggestions based on query length.

    Rule for ALL lengths: exact tanglish match always first.
    Then for 3+ letters: shortest word → alphabetical.
    For 1-2 letters: prefix matches by frequency.
    """
    if len(query) >= 3:
        def score(item):
            t = item['tanglish']
            if t == query:
                return (0, 0, t)          # exact match always first
            return (1, len(t), t)         # then shortest → alphabetical

    else:
        def score(item):
            t = item['tanglish']
            f = item.get('frequency', 0)
            if t == query:           return (0, -f, t)   # exact match
            if t.startswith(query):  return (1, -f, t)   # prefix match
            return (2, -f, t)                             # fuzzy/other

    return sorted(suggestions, key=score)