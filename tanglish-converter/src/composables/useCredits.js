import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export const DAILY_LIMIT = 30
const STORAGE_PREFIX = 'usil_credits_'

function getTodayString() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Global reactive state for grammar checks used
const anonChecksUsed = ref(0)
const userChecksUsed = ref(0)
const showCreditLimitModal = ref(false)

const { user, isAuthenticated } = useAuth()

function initCredits() {
    if (typeof window === 'undefined') return
    const today = getTodayString()
    const storedDate = localStorage.getItem(`${STORAGE_PREFIX}date`)

    if (storedDate !== today) {
        // New day: automatically refill credits to full (30 per day)
        localStorage.setItem(`${STORAGE_PREFIX}date`, today)
        localStorage.setItem(`${STORAGE_PREFIX}anon_used`, '0')
        anonChecksUsed.value = 0
        userChecksUsed.value = 0
        if (user.value?.id) {
            localStorage.setItem(`${STORAGE_PREFIX}user_${user.value.id}_used`, '0')
        }
    } else {
        const storedAnon = parseInt(localStorage.getItem(`${STORAGE_PREFIX}anon_used`) || '0', 10)
        anonChecksUsed.value = isNaN(storedAnon) ? 0 : storedAnon

        // Initialize user checks if logged in
        if (user.value?.id) {
            const storedUser = parseInt(localStorage.getItem(`${STORAGE_PREFIX}user_${user.value.id}_used`) || '0', 10)
            userChecksUsed.value = isNaN(storedUser) ? 0 : storedUser
        }
    }
}

// Run immediately
initCredits()

// Compute remaining credits: 30 credits per day, whether logged in or not
const totalCredits = computed(() => {
    return DAILY_LIMIT
})

const creditsUsed = computed(() => {
    return isAuthenticated.value && user.value?.id ? userChecksUsed.value : anonChecksUsed.value
})

const creditsLeft = computed(() => {
    return Math.max(0, totalCredits.value - creditsUsed.value)
})

const isOutOfCredits = computed(() => {
    return creditsLeft.value <= 0
})

export function useCredits() {
    // Re-verify date & refill if day rolled over
    initCredits()

    // Re-check if user ID changes
    if (user.value?.id) {
        const storedUser = parseInt(localStorage.getItem(`${STORAGE_PREFIX}user_${user.value.id}_used`) || '0', 10)
        userChecksUsed.value = isNaN(storedUser) ? 0 : storedUser
    }

    /**
     * Consume credits for grammar checks (1 check = 1 credit).
     * @param {number} count Number of credits to consume
     * @returns {boolean} True if credit consumed successfully, False if out of credits
     */
    const consumeCredit = (count = 1) => {
        if (creditsLeft.value < count) {
            showCreditLimitModal.value = true
            return false
        }

        if (isAuthenticated.value && user.value?.id) {
            userChecksUsed.value += count
            try {
                localStorage.setItem(`${STORAGE_PREFIX}user_${user.value.id}_used`, userChecksUsed.value.toString())
            } catch (_) {}
        } else {
            anonChecksUsed.value += count
            try {
                localStorage.setItem(`${STORAGE_PREFIX}anon_used`, anonChecksUsed.value.toString())
            } catch (_) {}
        }

        return true
    }

    /**
     * Check if user can run a grammar check without consuming yet
     */
    const canConvert = (count = 1) => {
        return creditsLeft.value >= count
    }

    const openCreditModal = () => {
        showCreditLimitModal.value = true
    }

    const closeCreditModal = () => {
        showCreditLimitModal.value = false
    }

    return {
        DAILY_LIMIT,
        ANON_LIMIT: DAILY_LIMIT,
        USER_LIMIT: DAILY_LIMIT,
        totalCredits,
        creditsUsed,
        creditsLeft,
        isOutOfCredits,
        showCreditLimitModal,
        consumeCredit,
        canConvert,
        openCreditModal,
        closeCreditModal
    }
}
