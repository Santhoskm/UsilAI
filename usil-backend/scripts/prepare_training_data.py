# import json
# import random
# import os
# from difflib import SequenceMatcher

# with open("data/tamilDictionary.json", encoding="utf-8") as f:
#     dictionary = json.load(f)

# training_data = []
# all_items = list(dictionary.items())

# def similarity(a, b):
#     return SequenceMatcher(None, a, b).ratio()

# for tanglish, correct_tamil in all_items:
#     training_data.append({
#         "tanglish": tanglish,
#         "tamil_candidate": correct_tamil,
#         "label": 1
#     })

#     similar_words = []

#     for other_tanglish, other_tamil in all_items:
#         if other_tamil == correct_tamil:
#             continue

#         score = similarity(tanglish, other_tanglish)

#         if score >= 0.55:
#             similar_words.append(other_tamil)

#     similar_words = list(set(similar_words))
#     random.shuffle(similar_words)

#     for wrong in similar_words[:3]:
#         training_data.append({
#             "tanglish": tanglish,
#             "tamil_candidate": wrong,
#             "label": 0
#         })

# random.shuffle(training_data)

# os.makedirs("scripts/output", exist_ok=True)

# with open("scripts/output/training_data.json", "w", encoding="utf-8") as f:
#     json.dump(training_data, f, ensure_ascii=False, indent=2)

# print(f"Created {len(training_data)} hard-negative training examples")

import json
import random
import os
from collections import defaultdict

with open("data/tamilDictionary.json", encoding="utf-8") as f:
    dictionary = json.load(f)

training_data = []

# group words by first 2 letters
groups = defaultdict(list)

for tanglish, tamil in dictionary.items():
    key = tanglish[:2]
    groups[key].append((tanglish, tamil))

for tanglish, correct_tamil in dictionary.items():
    training_data.append({
        "tanglish": tanglish,
        "tamil_candidate": correct_tamil,
        "label": 1
    })

    key = tanglish[:2]
    nearby_words = groups.get(key, [])

    wrongs = []

    for other_tanglish, other_tamil in nearby_words:
        if other_tanglish != tanglish and other_tamil != correct_tamil:
            wrongs.append(other_tamil)

    random.shuffle(wrongs)

    for wrong in wrongs[:3]:
        training_data.append({
            "tanglish": tanglish,
            "tamil_candidate": wrong,
            "label": 0
        })

random.shuffle(training_data)

os.makedirs("scripts/output", exist_ok=True)

with open("scripts/output/training_data.json", "w", encoding="utf-8") as f:
    json.dump(training_data, f, ensure_ascii=False, indent=2)

print(f"Created {len(training_data)} hard-negative training examples")