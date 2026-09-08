import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_dir = "reranker"
print("Loading model and tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(model_dir)
model = AutoModelForSequenceClassification.from_pretrained(model_dir)

print("Exporting to ONNX with dynamic batch size...")
dummy_input = tokenizer("tanglish", "tamil", return_tensors="pt", max_length=64, padding="max_length", truncation=True)
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
        "logits": {0: "batch_size"}
    },
    opset_version=14,
    do_constant_folding=True
)

print(f"Exported successfully to {onnx_path}")