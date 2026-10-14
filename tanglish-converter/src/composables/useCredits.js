import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

const ANON_LIMIT = 50
const USER_LIMIT = 500
const STORAGE_PREFIX = 'usil_credits_'

function getTodayString() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Global reactive state for words used
const anonWordsUsed = ref(0)
const userWordsUsed = ref(0)
const showCreditLimitModal = ref(false)

const { user, isAuthenticated } = useAuth()

function initCredits() {
    if (typeof window === 'undefined') return
    const today = getTodayString()
    const storedDate = localStorage.getItem(`${STORAGE_PREFIX}date`)

    if (storedDate !== today) {
        // New day: automatically refill credits to full (50 for guest, 500 for user)
        localStorage.setItem(`${STORAGE_PREFIX}date`, today)
        localStorage.setItem(`${STORAGE_PREFIX}anon_used`, '0')
        anonWordsUsed.value = 0
        userWordsUsed.value = 0
        if (user.value?.id) {
            localStorage.setItem(`${STORAGE_PREFIX}user_${user.value.id}_used`, '0')
        }
    } else {
        const storedAnon = parseInt(localStorage.getItem(`${STORAGE_PREFIX}anon_used`) || '0', 10)
        anonWordsUsed.value = isNaN(storedAnon) ? 0 : storedAnon

        // Initialize user words if logged in
        if (user.value?.id) {
            const storedUser = parseInt(localStorage.getItem(`${STORAGE_PREFIX}user_${user.value.id}_used`) || '0', 10)
            userWordsUsed.value = isNaN(storedUser) ? 0 : storedUser
        }
    }
}

// Run immediately
initCredits()

// Compute remaining credits based on authentication status
const totalCredits = computed(() => {
    return isAuthenticated.value ? USER_LIMIT : ANON_LIMIT
})

const creditsUsed = computed(() => {
    return isAuthenticated.value ? userWordsUsed.value : anonWordsUsed.value
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
        userWordsUsed.value = isNaN(storedUser) ? 0 : storedUser
    }

    /**
     * Consume credits for typing words (1 word = 1 credit).
     * @param {number} count Number of words converted
     * @returns {boolean} True if credit consumed successfully, False if out of credits
     */
    const consumeCredit = (count = 1) => {
        if (creditsLeft.value < count) {
            showCreditLimitModal.value = true
            return false
        }

        if (isAuthenticated.value && user.value?.id) {
            userWordsUsed.value += count
            try {
                localStorage.setItem(`${STORAGE_PREFIX}user_${user.value.id}_used`, userWordsUsed.value.toString())
            } catch (_) {}
        } else {
            anonWordsUsed.value += count
            try {
                localStorage.setItem(`${STORAGE_PREFIX}anon_used`, anonWordsUsed.value.toString())
            } catch (_) {}
        }

        return true
    }

    /**
     * Check if user can convert more words without consuming yet
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
        ANON_LIMIT,
        USER_LIMIT,
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
