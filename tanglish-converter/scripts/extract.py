import re

path = r'c:\Users\Santhosh\OneDrive\Desktop\company project\Usil 2.0\tanglish-converter\src\data\tamilEngine.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find("export function getTypingSuggestions")
if idx != -1:
    end_idx = content.find("// ── PASS 2:", idx)
    print(content[idx+1000:end_idx])
else:
    print("Not found")
