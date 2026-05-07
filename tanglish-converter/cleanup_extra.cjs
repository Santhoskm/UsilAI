const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'tamilEngine.js');
let content = fs.readFileSync(filePath, 'utf-8');
let lines = content.split(/\r?\n/);

console.log('Original line count:', lines.length);

// Find the comment line "// NOTE: Extra words previously defined..."
let noteLineIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('NOTE: Extra words previously defined')) {
        noteLineIdx = i;
        break;
    }
}

if (noteLineIdx === -1) {
    console.log('ERROR: Could not find the NOTE comment line');
    process.exit(1);
}

console.log('Found NOTE comment at line', noteLineIdx + 1, ':', lines[noteLineIdx].trim());

// Find the "Object.entries(extraWords)" line
let forEachLineIdx = -1;
for (let i = noteLineIdx; i < lines.length; i++) {
    if (lines[i].includes('Object.entries(extraWords)')) {
        forEachLineIdx = i;
        break;
    }
}

if (forEachLineIdx === -1) {
    console.log('ERROR: Could not find Object.entries(extraWords) line');
    process.exit(1);
}

console.log('Found forEach at line', forEachLineIdx + 1, ':', lines[forEachLineIdx].trim());

// Find the end of the forEach block (the closing `});`)
let forEachEndIdx = forEachLineIdx;
for (let i = forEachLineIdx; i < Math.min(forEachLineIdx + 5, lines.length); i++) {
    if (lines[i].includes('});')) {
        forEachEndIdx = i;
        break;
    }
}

console.log('forEach block ends at line', forEachEndIdx + 1);

// Skip any blank lines after the forEach block
let endIdx = forEachEndIdx + 1;
while (endIdx < lines.length && lines[endIdx].trim() === '') {
    endIdx++;
}

console.log('Will remove lines', noteLineIdx + 2, 'to', endIdx, '(0-indexed:', noteLineIdx + 1, 'to', endIdx - 1, ')');
console.log('Keeping NOTE comment at line', noteLineIdx + 1);
console.log('Next line after removal:', lines[endIdx] ? lines[endIdx].substring(0, 80) : 'END OF FILE');

// Remove lines from (noteLineIdx + 2) to (endIdx - 1) inclusive
// Keep the NOTE comment line and the line after it (the second comment)
// Actually, let me find the second comment line too
let secondCommentIdx = noteLineIdx + 1;
if (lines[secondCommentIdx] && lines[secondCommentIdx].includes('single source of truth')) {
    console.log('Found second comment at line', secondCommentIdx + 1);
} else {
    console.log('Second comment not found at expected position, content:', lines[secondCommentIdx]);
}

// Remove everything from secondCommentIdx + 1 to endIdx - 1
const removeStart = secondCommentIdx + 1;
const removeEnd = endIdx;
const removeCount = removeEnd - removeStart;

console.log(`\nRemoving ${removeCount} lines (from line ${removeStart + 1} to line ${removeEnd})`);

// Build new content
const newLines = [
    ...lines.slice(0, removeStart),
    '',  // One blank line separator
    ...lines.slice(removeEnd)
];

console.log('New line count:', newLines.length);
console.log('Lines removed:', lines.length - newLines.length);

// Verify context around the edit
console.log('\n--- Context around edit ---');
for (let i = Math.max(0, removeStart - 3); i < Math.min(newLines.length, removeStart + 5); i++) {
    console.log(`${i + 1}: ${newLines[i].substring(0, 100)}`);
}

// Write the file
const newContent = newLines.join('\r\n');
fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('\n✅ File saved successfully');
