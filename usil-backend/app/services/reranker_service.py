import os
import numpy as np
from transformers import AutoTokenizer
from onnxruntime import InferenceSession

class RerankerService:
    def __init__(self, model_dir="reranker"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        # Use ONNX for fast CPU inference (no GPU needed)
        self.session = InferenceSession(f"{model_dir}/model.onnx")
    
    def score(self, tanglish: str, candidates: list[str]) -> list[dict]:
        """Score each Tamil candidate for how well it matches the tanglish input."""
        results = []
        for tamil in candidates:
            enc = self.tokenizer(
                tanglish, tamil,
                max_length=64, padding="max_length",
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