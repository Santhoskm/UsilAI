import requests
import time

tests = [
    ("vila", ["விலை", "விளை", "வில்லை"]),
    ("padi", ["படி", "பாடி", "பாதி"]),
    ("kalam", ["களம்", "கலம்", "காலம்"]),
    ("palam", ["பழம்", "பலம்", "பாலம்"]),
    ("vali", ["வலி", "வழி", "வாளி"]),
]

url = "http://127.0.0.1:8000/api/usil/rerank/"

for tanglish, candidates in tests:
    try:
        r = requests.post(
            url,
            json={"tanglish": tanglish, "candidates": candidates},
            timeout=30
        )

        print("\nWORD:", tanglish)
        print("STATUS:", r.status_code)
        print("RESPONSE:", r.text)

    except Exception as e:
        print("\nWORD:", tanglish)
        print("ERROR:", e)

    time.sleep(2)