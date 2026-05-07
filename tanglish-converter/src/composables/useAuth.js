import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const STORAGE_KEY = 'usil_auth_user'

export function useAuth() {
    const router = useRouter()
    const user = ref(null)
    const isLoading = ref(false)
    const error = ref(null)

    // Check if user is logged in from localStorage
    const checkAuth = () => {
        const savedUser = localStorage.getItem(STORAGE_KEY)
        if (savedUser) {
            try {
                user.value = JSON.parse(savedUser)
                return true
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY)
                return false
            }
        }
        return false
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
                    id: Date.now().toString(),
                    email: foundUser.email,
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
                id: Date.now().toString(),
                email,
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
    const logout = () => {
        user.value = null
        localStorage.removeItem(STORAGE_KEY)
        router.push('/')
    }

    // Check if user is authenticated
    const isAuthenticated = computed(() => user.value !== null)

    // Initialize auth check on mount
    checkAuth()

    return {
        user,
        isLoading,
        error,
        isAuthenticated,
        login,
        signup,
        logout,
        checkAuth
    }
}