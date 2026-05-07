/**
 * Usil Backend API Service
 * 
 * Connects the frontend to the FastAPI backend at 192.168.1.8:8000
 * All requests go through Vite proxy: /api/usil → http://192.168.1.8:8000/api/v1
 */

const API_BASE = '/api/usil'

/**
 * Get word suggestions from the PostgreSQL database (63,000+ words)
 * @param {string} query - Tanglish text to search
 * @param {number} limit - Max suggestions to return (default 10)
 * @param {boolean} fuzzy - Enable fuzzy/typo-tolerant search
 * @returns {Promise<Array>} - [{tanglish, tamil, frequency}, ...]
 */
export async function fetchSuggestions(query, limit = 10, fuzzy = false) {
    if (!query || query.length < 1) return []

    try {
        const params = new URLSearchParams({
            q: query.toLowerCase(),
            limit: limit.toString(),
            fuzzy: fuzzy.toString()
        })

        const response = await fetch(`${API_BASE}/suggestions/?${params}`)

        if (!response.ok) {
            console.warn(`[API] Suggestions request failed: ${response.status}`)
            return []
        }

        const data = await response.json()
        return data.suggestions || []
    } catch (err) {
        // Backend might be offline — fail silently, frontend engine handles fallback
        console.warn('[API] Backend unreachable, using local engine:', err.message)
        return []
    }
}

/**
 * Check grammar using the backend's Claude integration
 * @param {string} text - Tamil/Tanglish text to check
 * @returns {Promise<Object>} - Grammar check result
 */
export async function checkGrammarViaBackend(text) {
    if (!text || text.trim().length === 0) return null

    try {
        const response = await fetch(`${API_BASE}/tools/grammar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        })

        if (!response.ok) return null
        return await response.json()
    } catch (err) {
        console.warn('[API] Grammar check failed:', err.message)
        return null
    }
}

/**
 * Transliterate text using the backend engine
 * @param {string} text - Tanglish text to convert
 * @returns {Promise<Object>} - {original, transliterated}
 */
export async function transliterateViaBackend(text) {
    if (!text) return null

    try {
        const response = await fetch(`${API_BASE}/tools/transliterate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        })

        if (!response.ok) return null
        return await response.json()
    } catch (err) {
        console.warn('[API] Transliterate failed:', err.message)
        return null
    }
}

/**
 * Check if the backend is reachable
 * @returns {Promise<boolean>}
 */
export async function isBackendOnline() {
    try {
        // /api/usil/suggestions/health → proxied → /api/v1/suggestions/health
        const response = await fetch(`${API_BASE}/suggestions/health`, { 
            signal: AbortSignal.timeout(3000) 
        })
        if (!response.ok) return false
        const data = await response.json()
        return data.status === 'healthy'
    } catch {
        return false
    }
}

// ── Frequency / usage tracking ──────────────────────────────────────────────

// Pending usage queue — flushed to backend every 30s
const _usageQueue = []
let _flushTimer = null

/**
 * Record that the user selected a word (enqueue for batch send)
 * @param {string} tanglish - The Tanglish key of the word
 * @param {string} tamil - The Tamil value (optional, for logging)
 */
export function enqueueUsage(tanglish, tamil = '') {
    if (!tanglish) return
    _usageQueue.push({ tanglish: tanglish.toLowerCase(), tamil })

    // Auto-flush after 30 seconds of the first enqueue
    if (!_flushTimer) {
        _flushTimer = setTimeout(flushUsageBatch, 30000)
    }
}

/**
 * Flush all pending usage records to the backend in one batch call.
 * Called automatically every 30s or on page unload.
 */
export async function flushUsageBatch() {
    if (_flushTimer) {
        clearTimeout(_flushTimer)
        _flushTimer = null
    }
    if (_usageQueue.length === 0) return

    const batch = _usageQueue.splice(0) // drain the queue
    try {
        const response = await fetch(`${API_BASE}/suggestions/usage/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: batch })
        })
        if (response.ok) {
            const data = await response.json()
            console.log(`[API] Frequency batch synced: ${data.updated}/${data.total} words`)
        }
    } catch (err) {
        console.warn('[API] Frequency sync failed:', err.message)
        // Put them back in the queue for next flush
        _usageQueue.unshift(...batch)
    }
}

// Flush on page unload so no usage data is lost
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (_usageQueue.length > 0) {
            // Use sendBeacon for reliability during unload
            const payload = JSON.stringify({ words: _usageQueue.splice(0) })
            navigator.sendBeacon(`${API_BASE}/suggestions/usage/batch`, 
                new Blob([payload], { type: 'application/json' }))
        }
    })
}
