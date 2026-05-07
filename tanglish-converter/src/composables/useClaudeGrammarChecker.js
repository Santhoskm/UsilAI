import { ref } from 'vue'
import axios from 'axios'

export function useClaudeGrammarChecker() {
    const isChecking = ref(false)
    const correctionResult = ref(null)
    const error = ref(null)

    // ✅ FIXED: Uncommented and properly defined
    const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
    const API_URL = '/api/claude/v1/messages'

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

        // Check if API key exists
        if (!API_KEY) {
            error.value = 'Claude API key not found. Please add VITE_CLAUDE_API_KEY to your .env file'
            console.error('API Key missing! Please check your .env file')
            return {
                hasErrors: false,
                corrections: [],
                correctedTanglish: tanglishText,
                correctedTamil: '',
                suggestions: [],
                error: 'API key not configured'
            }
        }

        isChecking.value = true
        error.value = null

        try {
            const prompt = `You are a Tamil language grammar expert. Analyze the following Tanglish text and correct any grammatical errors.

Text to check: "${tanglishText}"

Rules to check:
1. Verb conjugations (e.g., "irukeenga" should be "இருக்கீங்க")
2. Word order
3. Tense consistency
4. Respectful forms (neenga vs nee)
5. Question formation
6. Common Tamil grammar mistakes

Examples of corrections:
- "eppadi irukeenga" → "எப்படி இருக்கீங்க"
- "naan poren" → "நான் போறேன்"
- "nee enna panringa" → "நீ என்ன பண்ற"

Respond ONLY with valid JSON in this exact format (no other text before or after the JSON):

{
    "hasErrors": true,
    "corrections": [
        {
            "original": "original text segment",
            "corrected": "corrected text segment",
            "explanation": "brief explanation of the error",
            "type": "grammar"
        }
    ],
    "correctedTanglish": "the fully corrected Tanglish version",
    "correctedTamil": "the fully corrected Tamil version using Tamil script",
    "suggestions": ["suggestion1", "suggestion2"]
}

If no errors found, return:
{
    "hasErrors": false,
    "corrections": [],
    "correctedTanglish": "${tanglishText}",
    "correctedTamil": "",
    "suggestions": []
}`

            console.log('Calling Claude API for grammar check...')

            const response = await axios.post(API_URL, {
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                temperature: 0.3,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 30000
            })

            if (!response.data || !response.data.content || !response.data.content[0]) {
                throw new Error('Invalid response from Claude API')
            }

            const claudeResponse = response.data.content[0].text
            const result = parseClaudeResponse(claudeResponse, tanglishText)
            correctionResult.value = result
            return result

        } catch (err) {
            console.error('Claude API Error:', err)

            if (err.code === 'ECONNABORTED') {
                error.value = 'Request timeout. Please try again.'
            } else if (err.response?.status === 401) {
                error.value = 'Invalid API key. Please check your Claude API key in the .env file'
            } else if (err.response?.status === 429) {
                error.value = 'Rate limit exceeded. Please wait a moment and try again.'
            } else if (err.response?.status === 529) {
                error.value = 'Claude service is overloaded. Please try again in a few moments.'
            } else {
                error.value = err.response?.data?.error?.message || 'Failed to check grammar. Please try again.'
            }

            return {
                hasErrors: false,
                corrections: [],
                correctedTanglish: tanglishText,
                correctedTamil: '',
                suggestions: [],
                error: error.value
            }
        } finally {
            isChecking.value = false
        }
    }

    const parseClaudeResponse = (response, originalText) => {
        try {
            let jsonStr = response
            jsonStr = jsonStr.replace(/```json\n?/g, '')
            jsonStr = jsonStr.replace(/```\n?/g, '')
            jsonStr = jsonStr.trim()

            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                return {
                    hasErrors: parsed.hasErrors || false,
                    corrections: parsed.corrections || [],
                    correctedTanglish: parsed.correctedTanglish || originalText,
                    correctedTamil: parsed.correctedTamil || '',
                    suggestions: parsed.suggestions || []
                }
            } else {
                return {
                    hasErrors: false,
                    corrections: [],
                    correctedTanglish: originalText,
                    correctedTamil: '',
                    suggestions: []
                }
            }
        } catch (e) {
            console.error('Failed to parse Claude response:', e)
            return {
                hasErrors: false,
                corrections: [],
                correctedTanglish: originalText,
                correctedTamil: '',
                suggestions: []
            }
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