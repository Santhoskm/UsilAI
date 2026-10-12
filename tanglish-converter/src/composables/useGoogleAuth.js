import { ref } from 'vue'
import { useAuth } from './useAuth'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '976129638128-0buu4c96nqb0atuvk1ng6nuoicfmcoqh.apps.googleusercontent.com'

// Global single initialization state across components
let isGoogleInitialized = false
const loginCallbacks = new Set()

export function useGoogleAuth() {
    const { loginWithGoogle, isLoading, error } = useAuth()
    const isGoogleReady = ref(false)

    // Wait until Google GSI script is loaded in window
    const waitForGoogleScript = (timeout = 6000) => {
        return new Promise((resolve) => {
            if (window.google?.accounts?.id) {
                isGoogleReady.value = true
                return resolve(true)
            }
            const startTime = Date.now()
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval)
                    isGoogleReady.value = true
                    resolve(true)
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval)
                    console.warn('[GoogleAuth] Google Identity Services script timed out')
                    resolve(false)
                }
            }, 100)
        })
    }

    const initAndRender = async (containerElement, onLoginSuccess, options = {}) => {
        if (!containerElement) return false
        const ready = await waitForGoogleScript()
        if (!ready || !window.google?.accounts?.id) return false

        try {
            if (onLoginSuccess) {
                loginCallbacks.add(onLoginSuccess)
            }

            // Only initialize Google once globally to avoid GSI warnings
            if (!isGoogleInitialized) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: async (response) => {
                        if (response?.credential) {
                            const result = await loginWithGoogle(response.credential)
                            if (result.success) {
                                loginCallbacks.forEach((cb) => {
                                    try { cb(result.user) } catch (e) { console.error(e) }
                                })
                            }
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true
                })
                isGoogleInitialized = true
            }

            // Clear previous button container content if any
            containerElement.innerHTML = ''

            // Render Google official button
            window.google.accounts.id.renderButton(containerElement, {
                type: 'standard',
                theme: options.theme || 'outline',
                size: options.size || 'large',
                text: options.text || 'continue_with',
                shape: options.shape || 'pill',
                width: options.width || 320,
                logo_alignment: 'left',
                ...options
            })
            return true
        } catch (err) {
            console.error('[GoogleAuth] Error initializing Google button:', err)
            return false
        }
    }

    return {
        GOOGLE_CLIENT_ID,
        isGoogleReady,
        isLoading,
        error,
        initAndRender
    }
}
