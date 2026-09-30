import os
import sys

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_dir = "reranker"
print("Loading model and tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(model_dir)
model = AutoModelForSequenceClassification.from_pretrained(model_dir)
model.eval()

print("Exporting to ONNX with dynamic batch size...")
dummy_input = tokenizer(
    ["tanglish 1", "tanglish 2"],
    ["tamil 1", "tamil 2"],
    return_tensors="pt",
    max_length=64,
    padding="max_length",
    truncation=True,
)
input_ids = dummy_input["input_ids"]
attention_mask = dummy_input["attention_mask"]

onnx_path = os.path.join(model_dir, "model_dynamic.onnx")

torch.onnx.export(
    model,
    (input_ids, attention_mask),
    onnx_path,
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence_length"},
        "attention_mask": {0: "batch_size", 1: "sequence_length"},
        "logits": {0: "batch_size"},
    },
    opset_version=18,
    do_constant_folding=True,
)

print(f"Exported successfully to {onnx_path}")