import os
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
from onnxruntime import InferenceSession

class RerankerService:
    def __init__(self, model_dir="reranker"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        # Configure ONNX for high-throughput multi-threaded CPU inference
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = min(4, os.cpu_count() or 4)
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.session = InferenceSession(f"{model_dir}/model_dynamic.onnx", sess_options=opts)

    
    def score(self, tanglish: str, candidates: list[str], context: str = "") -> list[dict]:
        """Score each Tamil candidate for how well it matches the tanglish input."""
        if not candidates:
            return []
            
        input_text = f"{context} {tanglish}".strip()
        results = []
        for tamil in candidates:
            enc = self.tokenizer(
                input_text, tamil,
                max_length=32, padding="max_length",
                truncation=True, return_tensors="np"
            )
            logits = self.session.run(None, {
                "input_ids": enc["input_ids"],
                "attention_mask": enc["attention_mask"]
            })[0]
            # Softmax: probability that this candidate is CORRECT (label=1)
            score = float(np.exp(logits[0][1]) / np.sum(np.exp(logits[0])))
            results.append({"tamil": tamil, "score": score})

            
        # Sort highest score first
        return sorted(results, key=lambda x: x["score"], reverse=True)

    def score_phrases_batch(self, tanglish_phrase: str, tamil_phrases: list[str]) -> list[float]:
        """
        Sentence-level batch scoring: score complete Tamil phrase candidates
        against the full Tanglish phrase in a single ONNX forward pass.
        """
        if not tamil_phrases:
            return []

        # Tokenize all (tanglish, tamil_phrase) pairs in one call.
        # Short typing phrases are <= 32 tokens; max_length=32 runs 2x faster than 64.
        encodings = self.tokenizer(
            [tanglish_phrase] * len(tamil_phrases),
            tamil_phrases,
            max_length=32,
            padding="max_length",
            truncation=True,
            return_tensors="np"
        )

        # Attempt single ONNX forward pass for the entire batch; fall back to loop on shape mismatch
        try:
            logits = self.session.run(None, {
                "input_ids": encodings["input_ids"],
                "attention_mask": encodings["attention_mask"]
            })[0]

            scores = []
            for i in range(len(tamil_phrases)):
                exp_logits = np.exp(logits[i] - np.max(logits[i]))
                prob = float(exp_logits[1] / np.sum(exp_logits))
                scores.append(prob)
            return scores
        except Exception as e:
            # Fallback to sequential scoring if batch dimension mismatched in ONNX runtime
            scores = []
            for phrase in tamil_phrases:
                res = self.score(tanglish_phrase, [phrase])
                scores.append(res[0]["score"] if res else 0.5)
            return scores