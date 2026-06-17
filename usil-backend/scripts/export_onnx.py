import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

model = AutoModelForSequenceClassification.from_pretrained("reranker")
tokenizer = AutoTokenizer.from_pretrained("reranker")
model.eval()

dummy = tokenizer("vanakkam", "வணக்கம்", return_tensors="pt",
                  max_length=64, padding="max_length", truncation=True)

torch.onnx.export(
    model,
    (dummy["input_ids"], dummy["attention_mask"]),
    "reranker/model.onnx",
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={"input_ids": {0: "batch"}, "attention_mask": {0: "batch"}},
    opset_version=14
)
print("Exported reranker/model.onnx")