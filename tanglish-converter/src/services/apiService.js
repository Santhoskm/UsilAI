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
export async function fetchSuggestions(phrase, limit = 10, fuzzy = false) {
    if (!phrase || phrase.length < 1) return []
    const lowerQuery = phrase.toLowerCase();

    // Get the user's session correction cache
    let sessionCacheStr = '{}';
    try {
        const cacheStr = localStorage.getItem('usil_cache');
        if (cacheStr) {
            sessionCacheStr = cacheStr;
        }
    } catch (e) { }

    try {
        const params = new URLSearchParams({
            phrase: lowerQuery,
            limit: limit.toString(),
            fuzzy: fuzzy.toString(),
            session_cache: sessionCacheStr
        })

        const response = await fetch(`${API_BASE}/suggestions/?${params}`)

        if (!response.ok) {
            console.warn(`[API] Suggestions request failed: ${response.status}`)
            return []
        }

        const data = await response.json()
        return data.suggestions || []
    } catch (err) {
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
