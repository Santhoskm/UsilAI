import sys
sys.path.append(".")
from app.utils.word_former import _former

# test replacement
test_word = "ப்ொக்ும்"
word = test_word.replace("்ா", "ா").replace("்ி", "ி").replace("்ீ", "ீ").replace("்ு", "ு").replace("்ூ", "ூ").replace("்ெ", "ெ").replace("்ே", "ே").replace("்ை", "ை").replace("்ொ", "ொ").replace("்ோ", "ோ").replace("்ௌ", "ௌ")
print("Original:", test_word)
print("Fixed:", word)
