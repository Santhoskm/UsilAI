from typing import List, Dict

def rank_suggestions(suggestions: List[Dict], query: str) -> List[Dict]:
    """
    Re-rank suggestions: exact match first, then prefix, then by frequency.
    """
    def score(item):
        t = item['tanglish']
        f = item.get('frequency', 0)
        if t == query:           return (0, -f)   # exact match
        if t.startswith(query):  return (1, -f)   # prefix match
        return (2, -f)                             # fuzzy/other

    return sorted(suggestions, key=score)