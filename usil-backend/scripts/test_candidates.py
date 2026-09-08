import sys
sys.path.append(".")
from app.utils.word_former import _former

res = _former.generate("varaverpalar", max_candidates=50)
found = False
for i, r in enumerate(res):
    if r['tamil'] == 'வரவேற்பாளர்':
        print(f"FOUND at index {i}!")
        found = True
if not found:
    print("NOT FOUND!")
