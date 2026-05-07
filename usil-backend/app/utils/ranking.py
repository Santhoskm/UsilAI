from typing import List, Dict

def rank_suggestions(suggestions: List[Dict], query: str) -> List[Dict]:
    """
    Re-rank suggestions based on query length:

    - 1–2 letters → exact match first, then prefix, then by frequency (most used first)
    - 3+ letters  → exact match first, then shortest word first (increasing order),
                    then alphabetical — so the closest completion shows at the top
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