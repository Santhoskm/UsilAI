import { ref, computed } from 'vue'

export const TOTAL_CREDITS = 30
export const DAILY_LIMIT = 30
export const REFILL_HOURS = 16
const REFILL_MS = REFILL_HOURS * 60 * 60 * 1000 // 16 hours in milliseconds
const STORAGE_PREFIX = 'usil_credits_'

// Global shared reactive state (persists and carries over with or without login)
const sharedCreditsUsed = ref(0)
const refillTimestamp = ref(0)
const showCreditLimitModal = ref(false)

function initCredits() {
    if (typeof window === 'undefined') return
    const now = Date.now()

    let storedRefill = parseInt(localStorage.getItem(`${STORAGE_PREFIX}refill_at`) || '0', 10)
    let storedUsed = parseInt(localStorage.getItem(`${STORAGE_PREFIX}used`) || '0', 10)

    // Check legacy storage migration if needed
    if (isNaN(storedUsed) || storedUsed === 0) {
        const legacyAnon = parseInt(localStorage.getItem(`${STORAGE_PREFIX}anon_used`) || '0', 10)
        if (!isNaN(legacyAnon) && legacyAnon > 0) {
            storedUsed = legacyAnon
        }
    }

    if (!storedRefill || isNaN(storedRefill) || now >= storedRefill) {
        // Refill credits: 16 hours elapsed or first visit
        storedRefill = now + REFILL_MS
        storedUsed = 0
        try {
            localStorage.setItem(`${STORAGE_PREFIX}refill_at`, storedRefill.toString())
            localStorage.setItem(`${STORAGE_PREFIX}used`, '0')
        } catch (_) {}
    }

    refillTimestamp.value = storedRefill
    sharedCreditsUsed.value = isNaN(storedUsed) ? 0 : storedUsed
}

// Run immediately
initCredits()

// Compute remaining credits: 30 credits total, carried over whether logged in or not
const totalCredits = computed(() => TOTAL_CREDITS)

const creditsUsed = computed(() => sharedCreditsUsed.value)

const creditsLeft = computed(() => {
    if (refillTimestamp.value && Date.now() >= refillTimestamp.value) {
        initCredits()
    }
    return Math.max(0, TOTAL_CREDITS - sharedCreditsUsed.value)
})

const isOutOfCredits = computed(() => creditsLeft.value <= 0)

// Helper: formatted time until next refill (e.g. "15h 42m")
const formattedTimeUntilRefill = computed(() => {
    const diff = Math.max(0, refillTimestamp.value - Date.now())
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
})

export function useCredits() {
    // Check if 16h cycle has elapsed
    if (refillTimestamp.value && Date.now() >= refillTimestamp.value) {
        initCredits()
    }

    /**
     * Consume credits for grammar checks (1 check = 1 credit).
     * Carried over with or without login.
     * @param {number} count Number of credits to consume
     * @returns {boolean} True if consumed, False if out of credits
     */
    const consumeCredit = (count = 1) => {
        // Auto-refill if 16 hours passed
        if (refillTimestamp.value && Date.now() >= refillTimestamp.value) {
            initCredits()
        }

        if (creditsLeft.value < count) {
            showCreditLimitModal.value = true
            return false
        }

        sharedCreditsUsed.value += count
        try {
            localStorage.setItem(`${STORAGE_PREFIX}used`, sharedCreditsUsed.value.toString())
        } catch (_) {}

        return true
    }

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
        TOTAL_CREDITS,
        DAILY_LIMIT,
        REFILL_HOURS,
        totalCredits,
        creditsUsed,
        creditsLeft,
        isOutOfCredits,
        refillTimestamp,
        formattedTimeUntilRefill,
        showCreditLimitModal,
        consumeCredit,
        canConvert,
        openCreditModal,
        closeCreditModal
    }
}
