import sys
sys.path.append(".")
from app.utils.word_former import _former

results = _former.generate("varaverpalar", max_candidates=50)
print("TOTAL GENERATED:", len(results))
for i, r in enumerate(results[:15]):
    print(f"{i}: {r['tamil']}")
