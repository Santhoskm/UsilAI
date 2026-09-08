import sys
sys.path.append(".")
from app.utils.word_former import _former
res = _former.generate("thalchi", 15)
for r in res:
    print(r["tamil"])
