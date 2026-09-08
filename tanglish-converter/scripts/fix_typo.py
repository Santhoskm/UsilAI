import re

path = r'c:\Users\Santhosh\OneDrive\Desktop\company project\Usil 2.0\tanglish-converter\src\data\tamilEngine.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the typo from my previous bad regex
content = content.replace("type: 'type: '\\u{1F527} Rule',\n                    priority: 1,'", "type: '\\u{1F527} Rule',\n                    priority: 1,")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed typo.")
