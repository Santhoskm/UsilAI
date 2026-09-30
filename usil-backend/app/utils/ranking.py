import math
import itertools
from typing import List, Dict

from app.api.v1.rerank import get_reranker
from app.utils.consistency_engine import evaluate_sentence_consistency, apply_sandhi_to_sentence

# ── Tuning parameters ────────────────────────────────────────────────────────
ALPHA = -1.0      # phonetic cost penalty (lower cost = better)
BETA  = 0.5       # log₁₀(frequency) boost
GAMMA = 2.5       # ONNX phrase-level probability boost (raised from 2.0 for phrase scoring)

# ── Combinatorial limits ─────────────────────────────────────────────────────
MAX_CONTEXT_PER_POS = 1   # top candidates per context position
MAX_CURRENT         = 4   # top current-word candidates to score
MAX_PHRASES         = 6   # hard cap on total phrase combinations


def rank_combinations(
    current_candidates: List[Dict],
    tanglish_phrase: str,
    context_candidates: List[List[str]],
    limit: int = 10,
    session_cache: Dict = None
) -> List[Dict]:
    """
    Sentence-level scoring: build full phrase combinations from context +
    current-word candidates, score them as complete sentences via the ONNX
    reranker, then return the best current-word candidates.

    Args:
        current_candidates: Dicts for the word being typed.
                            Each has keys: tanglish, tamil, frequency, cost.
        tanglish_phrase:    Full Tanglish phrase (e.g. "naan padikka pogiren").
        context_candidates: List of lists — Tamil candidates for each preceding
                            context word. e.g. [["நான்","நாண்"], ["படிக்க","படிகா"]]
        limit:              Max suggestions to return.
        session_cache:      Optional mapping of tanglish->tamil words previously picked by user.

    Returns:
        Sorted list of suggestion dicts (best first), each with a "score" field.
    """
    if not current_candidates:
        return []
        
    session_cache = session_cache or {}

    # ── Fast path: Single-word query without context (skip ONNX forward pass) ─
    has_context = bool(context_candidates and any(context_candidates))
    if not has_context:
        scored = []
        for item in current_candidates:
            freq = max(1, item.get("frequency", 0))
            cost = item.get("cost", 0.0)
            score = (cost * ALPHA) + (math.log10(freq) * BETA)
            tanglish_key = item.get("tanglish", "").lower()
            if tanglish_key and session_cache.get(tanglish_key) == item["tamil"]:
                score += 10.0
            item["score"] = score
            scored.append(item)
        _apply_grammar_heuristics(scored, tanglish_phrase)
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:limit]

    # ── 1. Pre-filter current candidates by cheap signals (cost + frequency) ─
    #    so we don't waste ONNX inference on obviously bad candidates.
    for item in current_candidates:
        freq = max(1, item.get("frequency", 0))
        cost = item.get("cost", 0.0)
        item["_prefilter"] = (cost * ALPHA) + (math.log10(freq) * BETA)

    current_candidates.sort(key=lambda x: x["_prefilter"], reverse=True)
    top_current = current_candidates[:MAX_CURRENT]

    # ── 2. Build context prefix combinations (Cartesian product) ─────────────
    if context_candidates:
        trimmed_context = [cands[:MAX_CONTEXT_PER_POS] for cands in context_candidates]
        context_combos = list(itertools.product(*trimmed_context))
    else:
        context_combos = [()]  # no context words → single empty prefix

    # ── 3. Build full Tamil phrase candidates ────────────────────────────────
    # Each entry: (full_tamil_phrase, index_into_top_current)
    phrase_entries = []
    for ctx_combo in context_combos:
        context_prefix = " ".join(ctx_combo)
        for idx, item in enumerate(top_current):
            full_phrase = (context_prefix + " " + item["tamil"]).strip()
            phrase_entries.append((full_phrase, idx))
            if len(phrase_entries) >= MAX_PHRASES:
                break
        if len(phrase_entries) >= MAX_PHRASES:
            break

    # ── 4. Batch-score all phrases via ONNX in a single forward pass ─────────
    reranker = get_reranker()
    tamil_phrases = [entry[0] for entry in phrase_entries]
    onnx_scores = reranker.score_phrases_batch(tanglish_phrase, tamil_phrases)

    # ── 5. Aggregate: best ONNX score per current-word candidate ─────────────
    # A candidate appears in multiple phrase combos (paired with different
    # context prefixes). We take the MAX score — the best context interpretation.
    best_onnx = {}  # tamil_word -> best onnx score
    for (_, cand_idx), score in zip(phrase_entries, onnx_scores):
        tamil_word = top_current[cand_idx]["tamil"]
        if tamil_word not in best_onnx or score > best_onnx[tamil_word]:
            best_onnx[tamil_word] = score

    # ── 6. Compute final hybrid score for ALL candidates ─────────────────────
    # Candidates that weren't ONNX-scored (beyond MAX_CURRENT) get score=0.0
    scored = []
    for item in current_candidates:
        freq = max(1, item.get("frequency", 0))
        cost = item.get("cost", 0.0)
        onnx_score = best_onnx.get(item["tamil"], 0.0)

        final_score = (cost * ALPHA) + (math.log10(freq) * BETA) + (onnx_score * GAMMA)
        
        # Apply Session-Level Correction Bias
        tanglish_key = item.get("tanglish", "").lower()
        if tanglish_key and session_cache.get(tanglish_key) == item["tamil"]:
            final_score += 10.0  # Massive boost to ensure it's #1

        item["score"] = final_score
        item.pop("_prefilter", None)  # clean up temp key
        scored.append(item)

    # ── 7. Apply grammatical heuristic bonuses ───────────────────────────────
    _apply_grammar_heuristics(scored, tanglish_phrase)

    # ── 7.5. Apply Sentence Consistency Engine (Subject-Verb PNG & Sandhi) ────
    _apply_sentence_consistency_scores(scored, context_candidates)

    # ── 8. Sort and return ───────────────────────────────────────────────────
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def rank_suggestions(suggestions: List[Dict], query: str, context: str = "") -> List[Dict]:
    """
    Legacy word-level re-ranking (kept for backward compatibility).
    Re-rank suggestions using a hybrid fast mathematical formula + ONNX AI context scoring:
    score = (phonetic_cost * ALPHA) + (log10(frequency) * BETA) + (onnx_prob * GAMMA)
    """
    if not suggestions:
        return []

    # 1. Get ONNX scores
    reranker = get_reranker()
    candidates_list = [item["tamil"] for item in suggestions]
    ai_results = reranker.score(query, candidates_list, context)
    ai_score_map = {item["tamil"]: item["score"] for item in ai_results}

    # 2. Score candidates
    scored = []
    for item in suggestions:
        freq = max(1, item.get("frequency", 0))
        cost = item.get("cost", 0.0)
        ai_score = ai_score_map.get(item["tamil"], 0.0)

        score = (cost * ALPHA) + (math.log10(freq) * BETA) + (ai_score * GAMMA)

        item["score"] = score
        scored.append(item)

    # Apply grammatical heuristics
    _apply_grammar_heuristics(scored, query)

    # Sort descending by calculated score
    return sorted(scored, key=lambda x: x["score"], reverse=True)


def _apply_grammar_heuristics(scored: List[Dict], query: str):
    """
    Boost candidates that match expected Tamil verb-tense suffixes
    based on the Tanglish query ending.
    """
    query_lower = query.lower()
    for item in scored:
        tamil = item["tamil"]

        # Present tense verbs (r → ற)
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


def _apply_sentence_consistency_scores(scored: List[Dict], context_candidates: List[List[str]]):
    """
    Evaluates full sentence combinations (context + current candidate) for PNG agreement
    and Sandhi correctness, adjusting candidate final scores.
    """
    if not context_candidates or not scored:
        return

    # Extract top context words
    flat_context = [cands[0] for cands in context_candidates if cands]
    if not flat_context:
        return

    for item in scored:
        words = flat_context + [item["tamil"]]
        delta, formatted_sentence = evaluate_sentence_consistency(words)
        item["score"] += delta
        # Optionally attach formatted sandhi sentence
        if formatted_sentence:
            item["formatted_phrase"] = formatted_sentence

