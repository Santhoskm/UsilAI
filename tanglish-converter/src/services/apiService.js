/**
 * Usil Backend API Service
 * 
 * Connects the frontend to the FastAPI backend
 */

// Supports both local Vite proxy (/api/usil) and production server backend URL (e.g. VITE_API_BASE_URL=https://api.usilai.com)
export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
    : '/api/usil';

/**
 * Get word suggestions from the PostgreSQL database (63,000+ words)
 * @param {string} query - Tanglish text to search
 * @param {number} limit - Max suggestions to return (default 10)
 * @param {boolean} fuzzy - Enable fuzzy/typo-tolerant search
 * @returns {Promise<Array>} - [{tanglish, tamil, frequency}, ...]
 */
// In-memory cache for ultra-fast (0ms) transliteration candidate retrieval
const googleInputCache = new Map();
let lastBackendFailureTime = 0;

/**
 * Synchronously get cached Google candidates if already fetched previously
 */
export function getCachedGoogleInput(tanglish) {
    if (!tanglish) return null;
    const word = tanglish.trim().split(/\s+/).pop()?.toLowerCase();
    return (word && googleInputCache.has(word)) ? googleInputCache.get(word) : null;
}

/**
 * Get word suggestions from Google Input Tools or backend
 * Supercharged for instant responsiveness:
 * 1. Returns from memory cache immediately if exists.
 * 2. Fetches Google Input Tools concurrently.
 * 3. Does not block or stall when backend is slow or offline.
 * @param {string} phrase - Tanglish text to search
 * @param {number} limit - Max suggestions to return (default 10)
 * @param {boolean} fuzzy - Enable fuzzy search
 * @returns {Promise<Array>} - [{tanglish, tamil, frequency}, ...]
 */
export async function fetchSuggestions(phrase, limit = 10, fuzzy = false) {
    if (!phrase || phrase.length < 1) return []
    const lowerQuery = phrase.toLowerCase().trim()
    const word = lowerQuery.split(/\s+/).pop()

    // 1. Instant Cache Hit (0ms)
    if (word && googleInputCache.has(word)) {
        return googleInputCache.get(word)
    }

    // 2. Launch Google Input Tools immediately in parallel
    const googlePromise = fetchGoogleInputDirect(lowerQuery, limit)

    // If backend was unreachable recently, return Google results directly without wasting time
    const now = Date.now()
    if (now - lastBackendFailureTime < 30000) {
        return await googlePromise
    }

    // 3. Race backend with Google using a tight 250ms timeout
    try {
        let sessionCacheStr = '{}'
        try {
            sessionCacheStr = localStorage.getItem('usil_cache') || '{}'
        } catch (_) {}

        const params = new URLSearchParams({
            phrase: lowerQuery,
            limit: limit.toString(),
            fuzzy: fuzzy.toString(),
            session_cache: sessionCacheStr
        })

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 250)

        const backendPromise = fetch(`${API_BASE}/suggestions/?${params}`, { signal: controller.signal })
            .then(async (response) => {
                clearTimeout(timeoutId)
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = await response.json()
                return data.suggestions || []
            })
            .catch(() => {
                clearTimeout(timeoutId)
                lastBackendFailureTime = Date.now()
                return null
            })

        // Wait for whichever is faster or has valid candidates
        const [backendResults, googleResults] = await Promise.all([backendPromise, googlePromise])
        if (backendResults && backendResults.length > 0) {
            return backendResults
        }
        return googleResults || []
    } catch (err) {
        lastBackendFailureTime = Date.now()
        return await googlePromise
    }
}

/**
 * Fetch candidates directly from Google Input Tools API (online transliteration)
 * Accelerated with in-memory caching and 1.8s timeout
 */
export async function fetchGoogleInputDirect(tanglish, limit = 5) {
    if (!tanglish) return []
    const word = tanglish.trim().split(/\s+/).pop()?.toLowerCase()
    if (!word || !/^[a-zA-Z]+$/.test(word)) return []

    // 1. Check in-memory cache
    if (googleInputCache.has(word)) {
        return googleInputCache.get(word)
    }

    try {
        const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=ta-t-i0-und&num=${limit}&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 1800)
        
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timer)

        if (res.ok) {
            const data = await res.json()
            if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                const candidates = data[1][0][1]
                const results = candidates.slice(0, limit).map((tamil, idx) => ({
                    tanglish: word,
                    tamil: tamil,
                    frequency: 1000 - idx * 10,
                    source: 'google_online'
                }))

                // Cache the candidate list (LRU eviction past 1500 words)
                if (googleInputCache.size > 1500) {
                    const firstKey = googleInputCache.keys().next().value
                    googleInputCache.delete(firstKey)
                }
                googleInputCache.set(word, results)

                return results
            }
        }
    } catch (e) {
        // Fallback silently if offline or aborted
    }
    return []
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

export function enqueueUsage(tanglish, tamil = '') {
    if (!tanglish) return
    const lowerTanglish = tanglish.toLowerCase();

    _usageQueue.push({ tanglish: lowerTanglish, tamil })

    if (!_flushTimer) {
        _flushTimer = setTimeout(flushUsageBatch, 30000)
    }
}

/**
 * Persist explicit user correction for session-level bias
 */
export function saveSessionCorrection(tanglish, tamil) {
    if (!tanglish || !tamil) return;
    try {
        const lowerTanglish = tanglish.toLowerCase();
        const cache = JSON.parse(localStorage.getItem('usil_cache') || '{}');
        cache[lowerTanglish] = tamil;
        localStorage.setItem('usil_cache', JSON.stringify(cache));
    } catch (e) { }
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

// ── Admin API Endpoints & Authentication ────────────────────────────────────

const ADMIN_TOKEN_KEY = 'usil_admin_token'
const ADMIN_USER_KEY = 'usil_admin_username'

export function getAdminToken() {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function getAdminUsername() {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY) || 'admin'
}

export function isAdminLoggedIn() {
    return Boolean(getAdminToken())
}

export function adminLogout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        sessionStorage.removeItem(ADMIN_TOKEN_KEY)
        sessionStorage.removeItem(ADMIN_USER_KEY)
    }
}

function getAdminHeaders(extraHeaders = {}) {
    const token = getAdminToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...extraHeaders
    }
}

/**
 * Log in to the Admin Portal using Admin ID and Password
 */
export async function adminLogin(username, password, remember = true) {
    try {
        const response = await fetch(`${API_BASE}/admin/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username.trim(),
                password: password.trim()
            })
        })

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.detail || 'Invalid Admin ID or Password')
        }

        const data = await response.json()
        const storage = remember ? localStorage : sessionStorage
        storage.setItem(ADMIN_TOKEN_KEY, data.token)
        storage.setItem(ADMIN_USER_KEY, data.username)
        return data
    } catch (err) {
        console.error('[Admin API] Login failed:', err)
        throw err
    }
}

/**
 * Verify current Admin token validity
 */
export async function verifyAdminSession() {
    const token = getAdminToken()
    if (!token) return false
    try {
        const response = await fetch(`${API_BASE}/admin/auth/verify`, {
            headers: getAdminHeaders()
        })
        if (!response.ok) {
            adminLogout()
            return false
        }
        return true
    } catch {
        return false
    }
}

/**
 * Change Admin ID and Password
 */
export async function changeAdminCredentials({ currentPassword, newUsername, newPassword }) {
    try {
        const response = await fetch(`${API_BASE}/admin/auth/change-credentials`, {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({
                current_password: currentPassword,
                new_username: newUsername || undefined,
                new_password: newPassword
            })
        })

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.detail || 'Failed to update admin credentials')
        }

        const data = await response.json()
        if (data.token) {
            localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
            localStorage.setItem(ADMIN_USER_KEY, data.username)
        }
        return data
    } catch (err) {
        console.error('[Admin API] Change credentials failed:', err)
        throw err
    }
}

/**
 * Fetch paginated list of dictionary words with search and sorting
 */
export async function fetchAdminWords({ search = '', page = 1, limit = 20, sortBy = 'frequency', order = 'desc' } = {}) {
    try {
        const params = new URLSearchParams({
            search,
            page: page.toString(),
            limit: limit.toString(),
            sort_by: sortBy,
            order
        })
        const response = await fetch(`${API_BASE}/admin/words?${params}`, {
            headers: getAdminHeaders()
        })
        if (response.status === 401) {
            adminLogout()
            throw new Error('Unauthorized: Please log in with Admin ID and Password')
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Fetch words failed:', err)
        throw err
    }
}

/**
 * Create a new word in the dictionary
 */
export async function createAdminWord({ tanglish, tamil, frequency = 100, prefix = '' }) {
    try {
        const response = await fetch(`${API_BASE}/admin/words`, {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({
                tanglish,
                tamil,
                frequency: Number(frequency) || 100,
                prefix: prefix || undefined
            })
        })
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.detail || `HTTP ${response.status}`)
        }
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Create word failed:', err)
        throw err
    }
}

/**
 * Update an existing word in the dictionary
 */
export async function updateAdminWord(id, { tanglish, tamil, frequency, prefix }) {
    try {
        const response = await fetch(`${API_BASE}/admin/words/${id}`, {
            method: 'PUT',
            headers: getAdminHeaders(),
            body: JSON.stringify({
                tanglish,
                tamil,
                frequency: frequency !== undefined ? Number(frequency) : undefined,
                prefix: prefix || undefined
            })
        })
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.detail || `HTTP ${response.status}`)
        }
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Update word failed:', err)
        throw err
    }
}

/**
 * Delete a word from the dictionary
 */
export async function deleteAdminWord(id) {
    try {
        const response = await fetch(`${API_BASE}/admin/words/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        })
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.detail || `HTTP ${response.status}`)
        }
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Delete word failed:', err)
        throw err
    }
}

/**
 * Get system status, DB connection, in-memory Trie size, and reranker status
 */
export async function fetchAdminStatus() {
    try {
        const response = await fetch(`${API_BASE}/admin/status`, {
            headers: getAdminHeaders()
        })
        if (response.status === 401) {
            adminLogout()
            throw new Error('Unauthorized: Admin session expired')
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Fetch status failed:', err)
        throw err
    }
}

/**
 * Trigger in-memory Trie reload from PostgreSQL
 */
export async function reloadAdminTrie() {
    try {
        const response = await fetch(`${API_BASE}/admin/trie/reload`, {
            method: 'POST',
            headers: getAdminHeaders()
        })
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.detail || `HTTP ${response.status}`)
        }
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Reload Trie failed:', err)
        throw err
    }
}

/**
 * Get word usage analytics, top frequent words, and distribution
 */
export async function fetchAdminAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/admin/analytics`, {
            headers: getAdminHeaders()
        })
        if (response.status === 401) {
            adminLogout()
            throw new Error('Unauthorized: Admin session expired')
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Fetch analytics failed:', err)
        throw err
    }
}

/**
 * Fetch all user documents from PostgreSQL for the Admin dashboard
 */
export async function fetchAdminDocuments({ search = '', page = 1, limit = 25 } = {}) {
    try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        params.set('page', page)
        params.set('limit', limit)

        const response = await fetch(`${API_BASE}/admin/documents?${params.toString()}`, {
            headers: getAdminHeaders()
        })
        if (response.status === 401) {
            adminLogout()
            throw new Error('Unauthorized: Admin session expired')
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Fetch documents failed:', err)
        throw err
    }
}

/**
 * Delete a user document as admin
 */
export async function deleteAdminDocumentById(docId) {
    try {
        const response = await fetch(`${API_BASE}/admin/documents/${encodeURIComponent(docId)}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        })
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.detail || `HTTP ${response.status}`)
        }
        return await response.json()
    } catch (err) {
        console.error('[Admin API] Delete document failed:', err)
        throw err
    }
}

/**
 * ── Backend AI Tools APIs (Secure Server-Side Claude Calls) ────────────────
 */

/**
 * Server-side AI Grammar Check
 */
export async function checkGrammarAI(text) {
    const response = await fetch(`${API_BASE}/tools/grammar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${response.status}`)
    }
    return await response.json()
}

/**
 * Server-side Tamil SEO Blog Generator
 */
export async function generateBlogAI({ topic, tone = 'conversational', wordCount = 500, instructions = '' }) {
    const response = await fetch(`${API_BASE}/tools/blog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic,
            tone,
            word_count: Number(wordCount) || 500,
            instructions
        })
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${response.status}`)
    }
    return await response.json()
}

/**
 * Server-side Tamil OCR Vision
 */
export async function extractTamilOCRAI({ imageBase64, mimeType = 'image/jpeg' }) {
    const response = await fetch(`${API_BASE}/tools/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_base64: imageBase64,
            mime_type: mimeType
        })
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${response.status}`)
    }
    return await response.json()
}

/**
 * Server-side AI Word Transliteration Fallback
 */
export async function transliterateAIWord(tanglishWord, surroundingTamil = '') {
    const response = await fetch(`${API_BASE}/tools/ai-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tanglish_word: tanglishWord,
            surrounding_tamil: surroundingTamil
        })
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.tamil || null
}

/**
 * Server-side Tamil to English Translation
 */
export async function translateTamilToEnglishAI(text) {
    const response = await fetch(`${API_BASE}/tools/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${response.status}`)
    }
    return await response.json()
}

/**
 * Fetch up to 5 user documents from PostgreSQL
 * @param {string} userId - User identifier (ID or email)
 * @returns {Promise<Array>} - List of user documents
 */
export async function fetchUserDocuments(userId) {
    if (!userId) return []
    try {
        const response = await fetch(`${API_BASE}/documents?user_id=${encodeURIComponent(userId)}`)
        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data.documents) ? data.documents : []
    } catch (e) {
        console.warn('Could not fetch user documents from database, falling back to local storage', e)
        return []
    }
}

/**
 * Save / sync up to 5 documents to PostgreSQL for logged-in user
 * @param {string} userId - User identifier
 * @param {Array} documents - List of up to 5 documents
 */
export async function syncUserDocuments(userId, documents) {
    if (!userId || !Array.isArray(documents)) return { success: false }
    try {
        const payload = {
            user_id: userId,
            documents: documents.slice(0, 5).map(doc => ({
                id: doc.id,
                title: doc.title || 'New File',
                content: doc.content || '',
                plain_text: doc.plainText || doc.plain_text || '',
                word_count: doc.wordCount || doc.word_count || 0
            }))
        }

        const response = await fetch(`${API_BASE}/documents/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            console.warn('Failed to sync documents to database:', err)
            return { success: false, error: err }
        }

        return await response.json()
    } catch (e) {
        console.warn('Network error while syncing documents to database:', e)
        return { success: false, error: e }
    }
}

/**
 * Delete a specific document from PostgreSQL
 * @param {string} docId - Document ID
 * @param {string} userId - User identifier
 */
export async function deleteUserDocument(docId, userId) {
    if (!docId || !userId) return false
    try {
        const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(docId)}?user_id=${encodeURIComponent(userId)}`, {
            method: 'DELETE'
        })
        return response.ok
    } catch (e) {
        console.warn('Failed to delete document from database:', e)
        return false
    }
}


