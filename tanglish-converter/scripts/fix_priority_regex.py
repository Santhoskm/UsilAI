import re

path = r'c:\Users\Santhosh\OneDrive\Desktop\company project\Usil 2.0\tanglish-converter\src\data\tamilEngine.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace priority: 0 to 1 inside PASS 0
content = re.sub(
    r"type: '[^']*Rule',\s*priority: 0,", 
    r"type: '\g<0>'", 
    content
) # wait, I just need to match the priority line.

content = re.sub(
    r"(type: '[^']*Rule',\s*)priority: 0,", 
    r"\g<1>priority: 1,", 
    content
)

# Replace priority: 1 to 0 inside PASS 1
content = re.sub(
    r"(type: '[^']*Match',\s*)priority: 1,", 
    r"\g<1>priority: 0,", 
    content
)

# Replace priority: 1 to 0 inside PASS 2 (Trie Prefix matches)
content = re.sub(
    r"(type: '[^']*Trie',\s*)priority: 1,", 
    r"\g<1>priority: 0,", 
    content
)

# Replace priority: 3 to 0 inside PASS 3 (Dictionary Fallback)
content = re.sub(
    r"(type: '[^']*Word',\s*)priority: 3,", 
    r"\g<1>priority: 0,", 
    content
)

# Replace priority: 4 to 0 inside PASS 4 (Contains Match)
content = re.sub(
    r"(type: '[^']*Contains',\s*)priority: 4,", 
    r"\g<1>priority: 0,", 
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced priorities.")
