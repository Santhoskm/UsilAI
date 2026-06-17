import json, random, os

# Load your existing dictionary
with open("data/tamilDictionary.json", encoding="utf-8") as f:
    dictionary = json.load(f)

training_data = []

all_tamils = list(dictionary.values())

for tanglish, correct_tamil in dictionary.items():
    # Positive example: the correct Tamil for this Tanglish
    training_data.append({
        "tanglish": tanglish,
        "tamil_candidate": correct_tamil,
        "label": 1   # correct
    })
    
    # Negative examples: 2 random wrong Tamil words
    wrongs = random.sample(all_tamils, 5)
    for wrong in wrongs:
        if wrong != correct_tamil:
            training_data.append({
                "tanglish": tanglish,
                "tamil_candidate": wrong,
                "label": 0   # wrong
            })
            break  # just 1 negative per word to keep balance

random.shuffle(training_data)

# Save
os.makedirs("scripts/output", exist_ok=True)
with open("scripts/output/training_data.json", "w", encoding="utf-8") as f:
    json.dump(training_data, f, ensure_ascii=False, indent=2)

print(f"Created {len(training_data)} training examples")