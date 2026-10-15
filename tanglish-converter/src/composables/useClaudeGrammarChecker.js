import { ref } from 'vue'
import { checkGrammarAI } from '@/services/apiService'

export function useClaudeGrammarChecker() {
    const isChecking = ref(false)
    const correctionResult = ref(null)
    const error = ref(null)

    const checkGrammar = async (tanglishText) => {
        if (!tanglishText || tanglishText.trim().length === 0) {
            return {
                hasErrors: false,
                corrections: [],
                correctedTanglish: tanglishText,
                correctedTamil: '',
                suggestions: []
            }
        }

        isChecking.value = true
        error.value = null

        try {
            const data = await checkGrammarAI(tanglishText)
            const result = {
                hasErrors: data.hasErrors || false,
                corrections: data.corrections || [],
                correctedTanglish: data.correctedTanglish || tanglishText,
                correctedTamil: data.correctedTamil || '',
                suggestions: data.suggestions || []
            }
            correctionResult.value = result
            return result
        } catch (err) {
            console.error('[Grammar Check] Error:', err)
            error.value = err.message || 'Failed to check grammar via server'
            const fallback = {
                hasErrors: false,
                corrections: [],
                correctedTanglish: tanglishText,
                correctedTamil: '',
                suggestions: [],
                error: error.value
            }
            correctionResult.value = fallback
            return fallback
        } finally {
            isChecking.value = false
        }
    }

    const checkWord = async (word, context = '') => {
        const fullText = context ? `${context} ${word}` : word
        const result = await checkGrammar(fullText)
        if (result.hasErrors && result.corrections.length > 0) {
            const wordCorrection = result.corrections.find(c =>
                c.original.toLowerCase().includes(word.toLowerCase())
            )
            return wordCorrection || null
        }
        return null
    }

    let debounceTimeout = null
    const checkAsYouType = (text, callback, delay = 1000) => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout)
        }
        debounceTimeout = setTimeout(async () => {
            const result = await checkGrammar(text)
            if (callback && typeof callback === 'function') {
                callback(result)
            }
        }, delay)
    }

    const clearResult = () => {
        correctionResult.value = null
        error.value = null
    }

    return {
        isChecking,
        correctionResult,
        error,
        checkGrammar,
        checkWord,
        checkAsYouType,
        clearResult
    }
}