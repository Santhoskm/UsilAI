// ============================================================
// tamilDictLoader.js
// Lazy-loads the big dictionary in chunks — fast startup, 0ms lookup after first use
//
// HOW IT WORKS:
//   1. Split your big tamilDictionary_converted.json into 26 files (a-chunk.json, b-chunk.json...)
//      Run: node splitDict.js  (script below)
//   2. Import this loader into tamilEngine.js
//   3. Call loadChunkFor(word) before every dictionary lookup
//   4. Each chunk loads once, cached in memory forever after
//
// RESULT: First lookup for any 'v' word downloads v-chunk.json (~5MB).
//         Every lookup after = 0ms Map.get(). Exactly what TamilChatGPT does.
// ============================================================

// Path where your chunk files live — change to match your deployment
// e.g. '/dict/' or 'https://yourcdn.com/dict/' or './public/dict/'
const CHUNK_BASE_PATH = '/dict/';

// In-memory cache: one Map per letter, null = not loaded yet, 'loading' = in progress
const chunkCache = new Map();   // 'a' → Map {tanglish → tamil}
const loadingPromises = new Map(); // 'a' → Promise (deduplicates concurrent requests)

// ── CALLBACK SYSTEM ──
// When a chunk finishes loading, notify the engine so it can merge words
// into exactDictionary, fullWordMapping, and suggestionTrie
const chunkLoadedCallbacks = [];

/**
 * Register a callback that fires every time a chunk finishes loading.
 * The callback receives: (letterKey: string, entries: Map<string, string>)
 */
export function onChunkLoaded(callback) {
    if (typeof callback === 'function') {
        chunkLoadedCallbacks.push(callback);
    }
}

/**
 * Returns the chunk key for a word (first letter, lowercase)
 * Special chars / numbers → 'misc' chunk
 */
function chunkKey(word) {
    if (!word) return 'misc';
    const ch = word[0].toLowerCase();
    return /[a-z]/.test(ch) ? ch : 'misc';
}

/**
 * Loads the chunk for a given letter if not already loaded.
 * Returns a Promise that resolves when the chunk is ready.
 * Safe to call many times — deduplicates via loadingPromises.
 */
export async function loadChunkFor(word) {
    const key = chunkKey(word);
    if (chunkCache.has(key)) return; // already loaded
    if (loadingPromises.has(key)) return loadingPromises.get(key); // already loading

    const promise = (async () => {
        try {
            const url = `${CHUNK_BASE_PATH}${key}-chunk.json`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Store as Map for O(1) lookup
            const entries = new Map(Object.entries(data));
            chunkCache.set(key, entries);

            // Notify all registered callbacks
            for (const cb of chunkLoadedCallbacks) {
                try {
                    cb(key, entries);
                } catch (err) {
                    console.warn('tamilDictLoader: callback error:', err.message);
                }
            }

            console.log(`📦 Chunk '${key}' loaded: ${entries.size} words`);
        } catch (err) {
            // Chunk not found or network error — store empty Map so we don't retry forever
            chunkCache.set(key, new Map());
            console.warn(`tamilDictLoader: could not load chunk '${key}':`, err.message);
        } finally {
            loadingPromises.delete(key);
        }
    })();

    loadingPromises.set(key, promise);
    return promise;
}

/**
 * Synchronous lookup — returns Tamil string or null.
 * Call loadChunkFor(word) first (or use lookupAsync below).
 */
export function lookupChunk(word) {
    if (!word) return null;
    const key = chunkKey(word);
    const chunk = chunkCache.get(key);
    if (!chunk) return null;
    return chunk.get(word.toLowerCase()) || null;
}

/**
 * Async lookup — loads chunk if needed, then returns result.
 * Use this when you can await (e.g. in getTypingSuggestions async path).
 */
export async function lookupAsync(word) {
    await loadChunkFor(word);
    return lookupChunk(word);
}

/**
 * Returns all currently loaded entries across all chunks.
 * Useful for rebuilding the trie after startup.
 */
export function getAllLoadedEntries() {
    const all = new Map();
    for (const [, chunk] of chunkCache) {
        for (const [key, value] of chunk) {
            all.set(key, value);
        }
    }
    return all;
}

/**
 * Preload chunks for common first letters on app startup.
 * Call this once in your app's mounted() hook.
 * Loads in background — doesn't block UI.
 */
export function preloadCommonChunks() {
    // Most common tanglish starting letters — preload these silently on startup
    const common = ['v', 'p', 'k', 'n', 's', 'i', 'e', 't', 'm', 'a', 'u', 'r'];
    common.forEach(letter => loadChunkFor(letter));
}

/**
 * How many chunks are currently loaded in memory
 */
export function loadedChunkCount() {
    return chunkCache.size;
}
