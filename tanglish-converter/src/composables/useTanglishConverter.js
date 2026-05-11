import { ref } from 'vue'
import {
    transliterateWord,
    transliterateSentence,
    getTypingSuggestions,
    learnCorrection as engineLearnCorrection,
    getLearnedCorrection,
    getContextAwareSuggestions,
    transliterateWithContext,
    recordWordUsage,
    analyzeContext,
    getCurrentContext,
    resetContext
} from '@/data/tamilEngine'
import { fetchSuggestions, enqueueUsage } from '@/services/apiService'

export function useTanglishConverter() {
    const suggestions = ref([])
    const currentContext = ref(null)

    // Internal: last backend fetch abort controller
    let _abortCtrl = null

    const convertWord = (tanglishWord, surroundingText = '') => {
        if (!tanglishWord || tanglishWord.trim() === '') return ''
        const lower = tanglishWord.toLowerCase().trim()

        const learned = getLearnedCorrection(lower)
        if (learned) return learned

        // Use context-aware conversion if surrounding text is provided
        if (surroundingText) {
            return transliterateWithContext(lower, surroundingText)
        }
        return transliterateWord(lower)
    }

    const convertSentence = (sentence) => {
        if (!sentence) return ''
        // Analyze context of the sentence
        analyzeContext(sentence)
        return transliterateSentence(sentence)
    }

    /**
     * getSuggestions — SYNCHRONOUS (returns array immediately)
     * Uses the local tamilEngine for instant results.
     * Also fires a background fetch to the backend DB and merges if results arrive.
     */
    const getSuggestions = (partialWord, surroundingText = '') => {
        if (!partialWord || partialWord.length < 1) return []

        // Always normalize to lowercase before any lookup
        const normalizedWord = partialWord.toLowerCase().trim()

        // 1. Instant local engine results (synchronous)
        let localSuggestions
        if (surroundingText) {
            localSuggestions = getContextAwareSuggestions(normalizedWord, surroundingText)
        } else {
            localSuggestions = getTypingSuggestions(normalizedWord, 5)
        }

        // 2. Fire background fetch to backend (async, non-blocking)
        //    Cancel any previous in-flight request
        if (_abortCtrl) {
            try { _abortCtrl.abort() } catch { }
        }
        _abortCtrl = new AbortController()

        fetchSuggestions(normalizedWord, 5)
            .then(backendResults => {
                if (backendResults && backendResults.length > 0) {
                    // Merge: local first, then backend extras
                    // Dedup by BOTH tamil value AND tanglish key.
                    // Without tanglish dedup: vijaya→விஜய (backend) slips in even
                    // when vijay→விஜய் (local) is already shown, because the Tamil
                    // strings differ by just a pulli (விஜய் ≠ விஜய).
                    const seenTamil = new Set()
                    const seenTanglish = new Set()
                    const merged = []

                    for (const item of localSuggestions) {
                        seenTamil.add(item.tamil)
                        seenTanglish.add(item.tanglish)
                        merged.push(item)
                    }

                    for (const item of backendResults) {
                        if (!seenTamil.has(item.tamil) && !seenTanglish.has(item.tanglish)) {
                            seenTamil.add(item.tamil)
                            seenTanglish.add(item.tanglish)
                            merged.push({
                                tanglish: item.tanglish,
                                tamil: item.tamil,
                                frequency: item.frequency || 0,
                                source: 'db'
                            })
                        }
                    }

                    // Update reactive suggestions list (Vue will re-render)
                    suggestions.value = merged.slice(0, 8)
                }
            })
            .catch(() => {
                // Backend offline — no problem, local results are already shown
            })

        // 3. Return local results immediately (callers use this synchronously)
        return localSuggestions
    }

    const learnCorrection = (original, corrected) => {
        engineLearnCorrection(original, corrected)
        // Record frequency with tanglish key for trie boosting
        recordWordUsage(corrected, original)
        // Sync to backend DB frequency
        enqueueUsage(original, corrected)
    }

    const recordUsage = (tamilWord, tanglishWord = '') => {
        recordWordUsage(tamilWord, tanglishWord)
        // Sync to backend DB frequency
        if (tanglishWord) {
            enqueueUsage(tanglishWord, tamilWord)
        }
    }

    const getContext = () => {
        return getCurrentContext()
    }

    const clearContext = () => {
        resetContext()
    }

    return {
        suggestions,
        convertWord,
        convertSentence,
        getSuggestions,
        learnCorrection,
        recordUsage,
        getContext,
        clearContext
    }
}