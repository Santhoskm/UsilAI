import sys
sys.path.append(".")
from app.utils.word_former import TanglishWordFormer

former = TanglishWordFormer()
tokens = former._tokenize("pogirathu")
print("Tokens:", tokens)
syllables = []
for tok in tokens:
    syllables.append(former.PHONETIC_MAP.get(tok, [tok]))
print("Options:")
for t, opt in zip(tokens, syllables):
    print(f"{t}: {opt}")
