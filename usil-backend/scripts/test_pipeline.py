import requests

url = "http://127.0.0.1:8000/api/v1/suggestions"
params = {"q": "vanga"}

try:
    print(f"Testing endpoint: {url}?q={params['q']}")
    response = requests.get(url, params=params)
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        data = response.json()
        print("Suggestions returned:")
        for item in data:
            print(f"  - {item.get('tamil')} (Frequency: {item.get('frequency')})")
    else:
        print("Response:", response.text)
except Exception as e:
    print("Error:", e)
