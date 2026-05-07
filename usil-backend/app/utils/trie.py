class TrieNode:
    __slots__ = ('children', 'is_end', 'tamil_word', 'frequency')
    
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.tamil_word = None
        self.frequency = 0

class Trie:
    def __init__(self):
        self.root = TrieNode()
        self.size = 0
    
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
    
    def search_prefix(self, prefix: str, limit: int = 10) -> list:
        """Get all words with given prefix, sorted by frequency"""
        node = self.root
        prefix = prefix.lower()
        
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]
        
        results = []
        self._collect_words(node, prefix, results)
        
        results.sort(key=lambda x: (-x['frequency'], len(x['tanglish'])))
        return results[:limit]
    
    def _collect_words(self, node: TrieNode, current: str, results: list):
        if node.is_end:
            results.append({
                'tanglish': current,
                'tamil': node.tamil_word,
                'frequency': node.frequency
            })
        
        for char, child in node.children.items():
            self._collect_words(child, current + char, results)