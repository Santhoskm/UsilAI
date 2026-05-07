// splitDict.js — Run once with Node.js to split the big dictionary into chunks
// Usage: node splitDict.js
//
// Input:  tamilDictionary_converted.json  (your 164MB file)
// Output: public/dict/a-chunk.json, b-chunk.json, ... z-chunk.json, misc-chunk.json
//
// After running, put the public/dict/ folder in your project's static assets.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'tamilDictionary_cleaned.json');
const OUTPUT_DIR = path.join(__dirname, 'public', 'dict');

// Valid Tamil Unicode range: U+0B80 to U+0BFF
function isValidTamil(str) {
    if (!str || typeof str !== 'string') return false;
    if (str.length < 1 || str.length > 40) return false;
    // Must contain at least one Tamil character
    if (!/[\u0B80-\u0BFF]/.test(str)) return false;
    // Must NOT contain replacement chars or garbled bytes
    if (/[\\x80-\\x9F\uFFFD]/.test(str)) return false;
    // Must not have more than 3 consecutive non-Tamil chars (junk entries)
    if (/[^\u0B80-\u0BFF\u200C\u200D\s]{4,}/.test(str)) return false;
    return true;
}

function isValidKey(key) {
    if (!key || typeof key !== 'string') return false;
    if (key.length < 2 || key.length > 30) return false;
    // Must be lowercase English only
    if (!/^[a-z][a-z0-9 ]*$/.test(key)) return false;
    return true;
}

console.log('Reading input file...');
console.log('Input path:', INPUT_FILE);

// Check if file exists
if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: Input file not found at ${INPUT_FILE}`);
    console.error('Please make sure tamilDictionary_converted.json exists in the project root');
    process.exit(1);
}

// Read file as string
const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
console.log(`File size: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);

// Try to parse as JSON
let dictionary;
try {
    dictionary = JSON.parse(fileContent);
    console.log(`Parsed JSON with ${Object.keys(dictionary).length} entries`);
} catch (e) {
    console.error('Failed to parse JSON:', e.message);
    console.log('Attempting to parse line by line...');

    // Fallback: parse line by line
    const lines = fileContent.split('\n');
    dictionary = {};
    let validLines = 0;

    for (const line of lines) {
        const match = line.match(/^\s*"([^"]+)"\s*:\s*"([^"]+)"/);
        if (match) {
            dictionary[match[1]] = match[2];
            validLines++;
        }
    }
    console.log(`Parsed ${validLines} entries from line-by-line`);
}

const chunks = {}; // { 'a': {key: tamilValue}, 'b': {...}, ... }
let valid = 0;
let skipped = 0;

for (const [key, value] of Object.entries(dictionary)) {
    const lowerKey = key.toLowerCase().trim();
    const tamilValue = value.trim();

    if (!isValidKey(lowerKey) || !isValidTamil(tamilValue)) {
        skipped++;
        continue;
    }

    const letter = /^[a-z]/.test(lowerKey[0]) ? lowerKey[0] : 'misc';
    if (!chunks[letter]) chunks[letter] = {};
    chunks[letter][lowerKey] = tamilValue;
    valid++;
}

console.log(`Valid entries: ${valid}, Skipped: ${skipped}`);

// Write chunk files
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let totalChunks = 0;
for (const [letter, data] of Object.entries(chunks)) {
    const count = Object.keys(data).length;
    if (count === 0) continue;
    const outPath = path.join(OUTPUT_DIR, `${letter}-chunk.json`);
    fs.writeFileSync(outPath, JSON.stringify(data), 'utf8');
    const size = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
    console.log(`  ${letter}-chunk.json: ${count} entries, ${size}MB`);
    totalChunks++;
}

console.log(`\nDone! ${totalChunks} chunk files written to ${OUTPUT_DIR}/`);
console.log('Next step: restart your dev server with npm run dev');