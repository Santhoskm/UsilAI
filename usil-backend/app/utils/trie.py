class TrieNode:
    __slots__ = ('children', 'is_end', 'tamil_word', 'frequency')
    
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.tamil_word = None
        self.frequency = 0

SUBSTITUTIONS = {
    "zh": ["l", "ll"],
    "l": ["zh", "ll"],
    "ll": ["l", "zh"],
    "r": ["rr"],
    "rr": ["r"],
    "t": ["th", "tt"],
    "th": ["t"],
    "tt": ["t"],
    "k": ["kk"],
    "kk": ["k"],
    "p": ["pp"],
    "pp": ["p"],
    "c": ["ch"],
    "ch": ["c"],
}

# ── Hardcoded high-priority function words ────────────────────────────────
# These are pre-loaded into every Trie instance at startup with frequency=99999
# so they ALWAYS appear correctly, even if the PostgreSQL DB has a gap.
# Backend analog of _fallbackTamilMap in tamilEngine.js.
_HARDCODED_PRIORITY = {
    # Demonstratives
    "andha":       "அந்த",
    "antha":       "அந்த",
    "intha":       "இந்த",
    "inda":        "இந்த",
    "entha":       "எந்த",
    "enda":        "எந்த",
    # Pronouns
    "naan":        "நான்",
    "nan":         "நான்",
    "nii":         "நீ",
    "avan":        "அவன்",
    "aval":        "அவள்",
    "avar":        "அவர்",
    "avargal":     "அவர்கள்",
    "avangal":     "அவர்கள்",
    "naangal":     "நாங்கள்",
    "namma":       "நம்ம",
    "avanga":      "அவங்க",
    "ivan":        "இவன்",
    "ival":        "இவள்",
    # Common question words
    "enna":        "என்ன",
    "yenna":       "என்ன",
    "eppo":        "எப்போ",
    "eppadi":      "எப்படி",
    "enga":        "எங்க",
    # Common nouns (often hit as first word of phrase)
    "veedu":       "வீடு",
    "veettukku":   "வீட்டுக்கு",
    "kalloori":    "கல்லூரி",
    "kalloorikku": "கல்லூரிக்கு",
    "thanneer":    "தண்ணீர்",
    "kutty":       "குட்டி",
    "paiyan":      "பையன்",
    "naangal":     "நாங்கள்",
    # Copula / negation
    "illai":       "இல்லை",
    "irukku":      "இருக்கு",
    "seri":        "சரி",
    "aama":        "ஆமா",
    # Common verbs (present / past forms)
    "pogiren":      "போகிறேன்",
    "pogiran":      "போகிறான்",
    "pogiral":      "போகிறாள்",
    "pogirar":      "போகிறார்",
    "pogirom":      "போகிறோம்",
    "pogirathu":    "போகிறது",
    "pogirargal":   "போகிறார்கள்",
    "varugiren":    "வருகிறேன்",
    "varugiran":    "வருகிறான்",
    "varugiral":    "வருகிறாள்",
    "varugiraar":   "வருகிறார்",
    "varugirargal": "வருகிறார்கள்",
    "varugirom":    "வருகிறோம்",
    "varugirathu":  "வருகிறது",
    "padikiren":    "படிக்கிறேன்",
    "padikka":      "படிக்க",
    "padithal":     "படித்தாள்",
    "padithan":     "படித்தான்",
    "padithaar":    "படித்தார்",
    "paadugiraal":  "பாடுகிறாள்",
    "paadugiraan":  "பாடுகிறான்",
    "paadugiran":   "பாடுகிறான்",
    "paadugiren":   "பாடுகிறேன்",
    "paadugirar":   "பாடுகிறார்",
    "paadugirathu": "பாடுகிறது",
    "saapidugiren": "சாப்பிடுகிறேன்",
    "saappittom":   "சாப்பிட்டோம்",
    "saappittaan":  "சாப்பிட்டான்",
    "saappittaal":  "சாப்பிட்டாள்",
    "sendran":      "சென்றான்",
    "sendral":      "சென்றாள்",
    "sendren":      "சென்றேன்",
    "sendrom":      "சென்றோம்",
    "adainthaan":   "அடைந்தான்",
    "adainthaal":   "அடைந்தாள்",
    "vandhaargal":  "வந்தார்கள்",
    "vandhaan":     "வந்தான்",
    "vandhaal":     "வந்தாள்",
    "vandhen":      "வந்தேன்",
    "pusthagam":    "புத்தகம்",
    "pusthagathai": "புத்தகத்தை",
    "kudikren":     "குடிக்கிறேன்",
    "kudikiran":    "குடிக்கிறான்",
    "kudikiral":    "குடிக்கிறாள்",
    # Pure & Colloquial Tamil words
    "vanakkam":     "வணக்கம்",
    "nandri":       "நன்றி",
    "thanni":       "தண்ணி",
    "aaraychi":     "ஆராய்ச்சி",
    "muyarchi":     "முயற்சி",
    "magizhchi":    "மகிழ்ச்சி",
    "vaazhthukkal": "வாழ்த்துக்கள்",
    "pongo":        "போங்க",
    "panren":       "பண்றேன்",
    "irukanga":     "இருக்காங்க",
    "innaiku":      "இன்னைக்கு",
    "vanga":        "வாங்க",
    "vaanga":       "வாங்க",
    "naalaiku":     "நாளைக்கு",
    "naliku":       "நாளைக்கு",
    "varaverpalar": "வரவேற்பாளர்",
    "pogum":        "போகும்",
    "kalvi":        "கல்வி",
    "neram":        "நேரம்",
    "velai":        "வேலை",
    "kaalai":       "காலை",
    "tamil":        "தமிழ்",
    "thamizh":      "தமிழ்",
    "amma":         "அம்மா",
    "appa":         "அப்பா",
    "thambi":       "தம்பி",
    "dev":          "தேவ்",
    "deva":         "தேவா",
    "pusthakam":    "புத்தகம்",
}



class Trie:
    def __init__(self):
        self.root = TrieNode()
        self.size = 0
        # Pre-load hardcoded high-priority function words
        for tanglish, tamil in _HARDCODED_PRIORITY.items():
            self.insert(tanglish, tamil, frequency=99999)

    def clear(self):
        """Clears the trie and resets to hardcoded priority words."""
        self.root = TrieNode()
        self.size = 0
        for tanglish, tamil in _HARDCODED_PRIORITY.items():
            self.insert(tanglish, tamil, frequency=99999)

    def delete(self, tanglish: str) -> bool:
        """Removes a word from the Trie if present."""
        node = self.root
        path = []
        for char in tanglish.lower():
            if char not in node.children:
                return False
            path.append((node, char))
            node = node.children[char]
        
        if not node.is_end:
            return False
        
        node.is_end = False
        node.tamil_word = None
        node.frequency = 0
        self.size = max(0, self.size - 1)
        
        # Cleanup orphan nodes bottom-up
        for parent, char in reversed(path):
            child = parent.children[char]
            if not child.is_end and not child.children:
                del parent.children[char]
            else:
                break
        return True

    def insert(self, tanglish: str, tamil: str, frequency: int = 0):
        node = self.root
        for char in tanglish.lower():
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        
        if not node.is_end:
            node.is_end = True
            node.tamil_word = tamil
            node.frequency = frequency
            self.size += 1
        elif frequency > node.frequency:
            node.frequency = frequency
            node.tamil_word = tamil
    
    def search_prefix(self, prefix: str, limit: int = 10) -> list:
        """Get all words with given prefix.
        
        Sorting rules:
        - 1 or 2 letters typed  → sort by frequency (most used first)
        - 3+ letters typed      → sort by word length ascending (shortest first),
                                   then alphabetically, so closest matches appear first
        """
        node = self.root
        prefix = prefix.lower()
        
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]
        
        results = []
        MAX_EXTRA_CHARS = 4  # only suggest words up to 4 chars longer than what's typed
        self._collect_words(node, prefix, results, limit * 3, len(prefix) + MAX_EXTRA_CHARS)
        
        if len(prefix) >= 3:
            results.sort(key=lambda x: (
                0 if x['tanglish'] == prefix else 1,          # exact match always first
                len(x['tanglish']) - len(prefix),              # shorter completions first
                -x['frequency'],                               # then by frequency (highest first)
                x['tanglish']                                  # alphabetical tiebreak
            ))
        else:
            results.sort(key=lambda x: (-x['frequency'], len(x['tanglish'])))
        
        return results[:limit]

    def fuzzy_search_prefix(self, query: str, max_cost: float = 1.0, limit: int = 10) -> list:
        """
        Fuzzy search allowing specific Tanglish substitutions up to max_cost.
        """
        query = query.lower()
        results_map = {} # tanglish -> result dict (to deduplicate)
        
        # We start dfs from root
        self._fuzzy_search(self.root, query, 0, "", 0.0, max_cost, results_map, limit * 3, len(query) + 4)
        
        results = list(results_map.values())
        
        if len(query) >= 3:
            results.sort(key=lambda x: (
                0 if x['tanglish'] == query else (1 if x['cost'] == 0 else 2), 
                x['cost'],
                len(x['tanglish']) - len(query),
                -x['frequency'],
                x['tanglish']
            ))
        else:
            results.sort(key=lambda x: (x['cost'], -x['frequency'], len(x['tanglish'])))
            
        return results[:limit]

    def _fuzzy_search(self, node: TrieNode, query: str, q_idx: int, current_str: str, current_cost: float, max_cost: float, results_map: dict, limit: int, max_len: int):
        if current_cost > max_cost:
            return
            
        # If we have consumed the entire query, collect completions from this node
        if q_idx == len(query):
            # We treat completions as cost +0, but limit their length
            temp_results = []
            self._collect_words(node, current_str, temp_results, limit, max_len)
            for res in temp_results:
                t = res['tanglish']
                # Store if not present, or if we found a path with lower cost
                if t not in results_map or current_cost < results_map[t]['cost']:
                    res['cost'] = current_cost
                    results_map[t] = res
            return

        # 1. Exact match for current character
        char = query[q_idx]
        if char in node.children:
            self._fuzzy_search(node.children[char], query, q_idx + 1, current_str + char, current_cost, max_cost, results_map, limit, max_len)
            
        # 2. General doubled consonant in query (e.g., query has 'kk', try matching single 'k')
        if q_idx + 1 < len(query) and query[q_idx] == query[q_idx+1]:
            # Consume 2 chars from query, 1 char from trie
            if char in node.children:
                self._fuzzy_search(node.children[char], query, q_idx + 2, current_str + char, current_cost + 1.0, max_cost, results_map, limit, max_len)
                
        # 3. General doubled consonant in Trie (e.g., query has 'k', try matching 'kk')
        if char in node.children and char in node.children[char].children:
            # Consume 1 char from query, 2 chars from trie
            self._fuzzy_search(node.children[char].children[char], query, q_idx + 1, current_str + char + char, current_cost + 1.0, max_cost, results_map, limit, max_len)

        # 4. Dictionary-based substitutions
        for sub_from, targets in SUBSTITUTIONS.items():
            if query[q_idx:].startswith(sub_from):
                for target in targets:
                    # Try to traverse the target path in the trie
                    curr_node = node
                    valid_path = True
                    for t_char in target:
                        if t_char in curr_node.children:
                            curr_node = curr_node.children[t_char]
                        else:
                            valid_path = False
                            break
                    if valid_path:
                        self._fuzzy_search(curr_node, query, q_idx + len(sub_from), current_str + target, current_cost + 1.0, max_cost, results_map, limit, max_len)
    
    def _collect_words(self, node: TrieNode, current: str, results: list, limit: int = 100, max_len: int = 999):
        if len(current) > max_len:
            return
        # Bug 3 fix: stop early when limit reached — prevents unbounded recursion
        if len(results) >= limit:
            return
        if node.is_end:
            results.append({
                'tanglish': current,
                'tamil': node.tamil_word,
                'frequency': node.frequency
            })
        for char, child in node.children.items():
            if len(results) >= limit:
                break
            self._collect_words(child, current + char, results, limit, max_len)