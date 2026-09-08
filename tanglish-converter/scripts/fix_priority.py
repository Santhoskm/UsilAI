import re

path = r'c:\Users\Santhosh\OneDrive\Desktop\company project\Usil 2.0\tanglish-converter\src\data\tamilEngine.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix priority 0 for Rule to priority 1
content = content.replace("type: '🔧 Rule',\n                    priority: 0,", "type: '🔧 Rule',\n                    priority: 1,")
content = content.replace("type: '⭐ Match',\n                priority: 1,", "type: '⭐ Match',\n                priority: 0,")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced priorities.")
