import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const STORAGE_KEY = 'usil_auth_user'

// Module-level singleton reactive state shared across all components
const user = ref(null)
const isLoading = ref(false)
const error = ref(null)
const preLogoutHooks = new Set()

export function registerPreLogoutHook(fn) {
    if (typeof fn === 'function') {
        preLogoutHooks.add(fn)
    }
    return () => preLogoutHooks.delete(fn)
}

// Helper to parse Google JWT credential safely
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        )
        return JSON.parse(jsonPayload)
    } catch (e) {
        console.error('Error decoding Google JWT', e)
        return null
    }
}

// Synchronously check and restore auth from localStorage
const checkAuth = () => {
    if (typeof window === 'undefined') return false
    const savedUser = localStorage.getItem(STORAGE_KEY)
    if (savedUser) {
        try {
            user.value = JSON.parse(savedUser)
            return true
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY)
            user.value = null
            return false
        }
    }
    user.value = null
    return false
}

// Run initial check immediately
checkAuth()

// Sync auth state across browser tabs
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            checkAuth()
        }
    })
}

// Shared computed authentication flag
const isAuthenticated = computed(() => user.value !== null)

export function useAuth() {
    let router = null
    try {
        router = useRouter()
    } catch (_) {}

    // Google Sign-In Handler
    const loginWithGoogle = async (credential) => {
        isLoading.value = true
        error.value = null

        try {
            const payload = parseJwt(credential)
            if (!payload || !payload.email) {
                throw new Error('Failed to retrieve user profile from Google')
            }

            const cleanEmail = payload.email.toLowerCase().trim()
            const userData = {
                id: cleanEmail,
                email: cleanEmail,
                sub: payload.sub || '',
                name: payload.name || payload.email.split('@')[0],
                picture: payload.picture || '',
                role: 'user',
                provider: 'google',
                loginTime: new Date().toISOString()
            }

            user.value = userData
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
            return { success: true, user: userData }
        } catch (err) {
            error.value = err.message || 'Google sign-in failed. Please try again.'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Login function
    const login = async (email, password) => {
        isLoading.value = true
        error.value = null

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 800))

            // Demo credentials (replace with real API call)
            const demoUsers = [
                { email: 'demo@usil.ai', password: 'demo123', name: 'Demo User', role: 'user' },
                { email: 'test@usil.ai', password: 'test123', name: 'Test User', role: 'user' }
            ]

            const foundUser = demoUsers.find(u => u.email === email && u.password === password)

            if (foundUser) {
                const userData = {
                    id: foundUser.email.toLowerCase(),
                    email: foundUser.email,
                    sub: '',
                    name: foundUser.name,
                    role: foundUser.role,
                    loginTime: new Date().toISOString()
                }
                user.value = userData
                localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
                return { success: true, user: userData }
            } else {
                error.value = 'Invalid email or password'
                return { success: false, error: 'Invalid credentials' }
            }
        } catch (err) {
            error.value = err.message || 'Login failed. Please try again.'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Signup function
    const signup = async (name, email, password) => {
        isLoading.value = true
        error.value = null

        try {
            await new Promise(resolve => setTimeout(resolve, 800))

            // Check if user already exists (demo)
            const existingUser = localStorage.getItem(STORAGE_KEY)
            if (existingUser) {
                const parsed = JSON.parse(existingUser)
                if (parsed.email === email) {
                    error.value = 'User already exists with this email'
                    return { success: false, error: 'User already exists' }
                }
            }

            const userData = {
                id: email.toLowerCase(),
                email,
                sub: '',
                name,
                role: 'user',
                createdAt: new Date().toISOString()
            }
            user.value = userData
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
            return { success: true, user: userData }
        } catch (err) {
            error.value = err.message || 'Signup failed. Please try again.'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Logout function
    const logout = async () => {
        for (const hook of preLogoutHooks) {
            try {
                await hook()
            } catch (e) {
                console.error('[Auth] Pre-logout hook failed:', e)
            }
        }
        user.value = null
        localStorage.removeItem(STORAGE_KEY)
        if (router) {
            router.push('/')
        } else if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.href = '/'
        }
    }

    return {
        user,
        isLoading,
        error,
        isAuthenticated,
        login,
        loginWithGoogle,
        signup,
        logout,
        checkAuth
    }
}