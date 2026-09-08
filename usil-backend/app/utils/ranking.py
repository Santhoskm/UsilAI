from typing import List, Dict
# 1. Import the Deep Learning Reranker
from app.api.v1.rerank import get_reranker

def rank_suggestions(suggestions: List[Dict], query: str) -> List[Dict]:
    """
    Re-rank suggestions using the Deep Learning Model.
    """
    if not suggestions:
        return []

    # 2. Load the model from memory
    reranker = get_reranker()
    
    # 3. Extract just the Tamil words to send to the AI
    candidates = [item["tamil"] for item in suggestions]
    
    # 4. Get the AI scores (this returns a sorted list of dictionaries like {"tamil": "...", "score": 0.99})
    scored = reranker.score(query, candidates)
    
    # 4.5 Apply grammatical heuristics to fix AI model biases
    query_lower = query.lower()
    for item in scored:
        tamil = item["tamil"]
        score = item["score"]
        
        # Present tense verbs (r -> ற)
        if query_lower.endswith(("girathu", "kirathu", "rathu")) and tamil.endswith(("கிறது", "றது")):
            item["score"] += 0.5
        if query_lower.endswith(("giren", "kiren", "ren")) and tamil.endswith(("கிறேன்", "றேன்")):
            item["score"] += 0.5
        if query_lower.endswith(("giran", "kiran", "ran")) and tamil.endswith(("கிறான்", "றான்")):
            item["score"] += 0.5
        if query_lower.endswith(("giral", "kiral", "ral")) and tamil.endswith(("கிறாள்", "றாள்")):
            item["score"] += 0.5
        if query_lower.endswith(("girom", "kirom", "rom")) and tamil.endswith(("கிறோம்", "றோம்")):
            item["score"] += 0.5
        if query_lower.endswith(("girargal", "kirargal", "rargal", "ranga")) and tamil.endswith(("கிறார்கள்", "றார்கள்", "றாங்க", "கிறாங்க")):
            item["score"] += 0.5
        if query_lower.endswith(("giringa", "kiringa", "ringa")) and tamil.endswith(("கிறீங்க", "றீங்க")):
            item["score"] += 0.5
            
    # Re-sort by score in descending order after heuristics
    scored = sorted(scored, key=lambda x: x["score"], reverse=True)
    
    # 5. Re-build your original suggestions list, but in the new AI-sorted order!
    ranked_suggestions = []
    for s in scored:
        # Find the original dictionary that matches this tamil word
        original_item = next((item for item in suggestions if item["tamil"] == s["tamil"]), None)
        
        if original_item:
            ranked_suggestions.append(original_item)
            
    return ranked_suggestions
