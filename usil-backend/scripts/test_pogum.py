import sys
sys.path.append(".")
from app.utils.word_former import _former
res = _former.generate("pogum", 15)
print("BACKEND OUTPUT:")
for r in res:
    print(r["tamil"])
