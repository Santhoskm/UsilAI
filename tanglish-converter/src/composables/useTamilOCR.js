import { ref } from 'vue'
import axios from 'axios'
import { createWorker } from 'tesseract.js'

export function useTamilOCR() {
    const isProcessing = ref(false)
    const progress = ref(0)
    const statusMessage = ref('')
    const error = ref(null)
    const ocrEngine = ref('ai') // 'ai' (Claude Vision) or 'tesseract' (Local)

    const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
    const API_URL = 'https://api.anthropic.com/v1/messages'
    const activeEngineUsed = ref('ai')

    let worker = null

    // Convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const result = reader.result
                const base64String = result.split(',')[1]
                resolve({ base64: base64String, mimeType: file.type || 'image/jpeg' })
            }
            reader.onerror = (err) => reject(err)
        })
    }

    // AI Vision OCR using Claude
    const extractWithClaudeVision = async (imageFile) => {
        if (!API_KEY) {
            throw new Error('Claude API key not configured')
        }

        statusMessage.value = 'Preparing image for Claude AI Vision...'
        progress.value = 25

        const { base64, mimeType } = await fileToBase64(imageFile)

        statusMessage.value = 'Claude AI Vision is reading Tamil characters...'
        progress.value = 60

        const prompt = `You are a specialized Tamil language Optical Character Recognition (OCR) engine.
Your task is to transcribe ALL printed text from this Tamil document or newspaper image with high fidelity.

MANDATORY SCRIPT & ACCURACY RULES:
1. SCRIPT ENFORCEMENT: The text in this image is exclusively TAMIL SCRIPT (தமிழ் எழுத்துக்கள்). Under NO circumstances should you produce Hindi or Devanagari (देवनागरी) characters or Arabic script.
2. Output ONLY in pure Tamil Unicode characters (e.g. அ, ஆ, இ, க, ங, ச, ஞ, ட, ண, த, ந, ப, ம, ய, ர, ல, வ, ழ, ள, ற, ன, etc.).
3. Transcribe Tamil headlines, articles, subheadings, and captions with 100% exact Tamil spelling and correct ligatures (மெய், உயிர்மெய் எழுத்துக்கள்).
4. If there are English characters, initials, abbreviations, names (e.g., TVS, Holy Angel, St. Joseph), or numbers (0-9), output them in standard English / Latin digits.
5. NO META COMMENTARY: Do NOT include any descriptions, image captions, visual summaries, or bracketed notes (e.g., do NOT output "[Photo of...]" or "[Bottom section contains...]").
6. If this is a newspaper clipping or document with multiple columns, transcribe each article column-by-column in natural reading order with appropriate headings and paragraphs.

Output ONLY the raw transcribed text. Do NOT add any preamble or explanations.`

        const response = await axios.post(
            API_URL,
            {
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 3500,
                temperature: 0.2,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: mimeType,
                                    data: base64
                                }
                            },
                            {
                                type: 'text',
                                text: prompt
                            }
                        ]
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                }
            }
        )

        progress.value = 95
        statusMessage.value = 'Formatting extracted text...'

        const content = response.data?.content?.[0]?.text || ''
        return cleanExtractedText(content)
    }

    // Local Tesseract OCR
    const initWorker = async () => {
        if (worker) return worker

        statusMessage.value = 'Initializing Tesseract Tamil engine...'
        worker = await createWorker('tam+eng', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    progress.value = Math.round(m.progress * 100)
                    statusMessage.value = `Recognizing text (${progress.value}%)...`
                } else if (m.status) {
                    statusMessage.value = `${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`
                }
            }
        })

        await worker.setParameters({
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1'
        })

        return worker
    }

    const extractWithTesseract = async (imageFile) => {
        const workerInstance = await initWorker()
        const imageUrl = URL.createObjectURL(imageFile)
        statusMessage.value = 'Scanning image with Tesseract...'
        const { data: { text } } = await workerInstance.recognize(imageUrl)
        URL.revokeObjectURL(imageUrl)
        return cleanExtractedText(text)
    }

    // Unified extraction with automatic fallback
    const extractTextFromImage = async (imageFile) => {
        if (!imageFile) {
            error.value = 'No image file provided'
            return ''
        }

        isProcessing.value = true
        error.value = null
        progress.value = 10
        statusMessage.value = 'Starting extraction...'

        try {
            let extracted = ''

            if (ocrEngine.value === 'ai') {
                try {
                    statusMessage.value = 'Running Claude AI Vision OCR...'
                    extracted = await extractWithClaudeVision(imageFile)
                    activeEngineUsed.value = 'Claude AI Vision'
                } catch (aiErr) {
                    console.warn('[OCR] AI Vision failed or rate limited, falling back to Tesseract:', aiErr)
                    statusMessage.value = 'Switching to local Tesseract engine...'
                    extracted = await extractWithTesseract(imageFile)
                    activeEngineUsed.value = 'Local Tesseract'
                }
            } else {
                extracted = await extractWithTesseract(imageFile)
                activeEngineUsed.value = 'Local Tesseract'
            }

            progress.value = 100
            statusMessage.value = 'Extraction complete!'
            return cleanExtractedText(extracted)
        } catch (err) {
            console.error('[OCR Error]:', err)
            error.value = err.message || 'Failed to extract text. Please ensure the image is clear and try again.'
            return ''
        } finally {
            isProcessing.value = false
        }
    }

    const extractTextFromMultipleImages = async (imageFiles) => {
        if (!imageFiles || imageFiles.length === 0) return ''

        isProcessing.value = true
        error.value = null
        let allText = ''

        try {
            for (let i = 0; i < imageFiles.length; i++) {
                statusMessage.value = `Processing image ${i + 1} of ${imageFiles.length}...`
                progress.value = Math.round((i / imageFiles.length) * 100)

                const text = await extractTextFromImage(imageFiles[i])
                if (text) {
                    allText += (allText ? '\n\n---\n\n' : '') + text
                }
            }
            return allText
        } catch (err) {
            error.value = 'Failed to process some images.'
            return allText
        } finally {
            isProcessing.value = false
            progress.value = 100
        }
    }

    const cleanExtractedText = (text) => {
        if (!text) return ''
        return text
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove invisible non-printable control chars
            .replace(/\[(?:Bottom|Top|Left|Right|Middle|Section|Image|Photo|Photograph|Contains|Visual|Note|Caption|Figure).*?\]/gis, '') // strip bracketed visual commentaries
            .replace(/[\u0900-\u097F]/g, '') // purge any accidental Devanagari / Hindi script
            .replace(/[\u0600-\u06FF]/g, '') // purge any accidental Arabic / Persian script
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ ]{2,}/g, ' ')
            .trim()
    }

    const terminateWorker = async () => {
        if (worker) {
            try { await worker.terminate() } catch (_) { }
            worker = null
        }
    }

    const validateImage = (file) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp']
        const maxSize = 15 * 1024 * 1024

        if (!validTypes.includes(file.type)) {
            return { valid: false, message: 'Please upload JPEG, PNG, WEBP, or BMP images.' }
        }
        if (file.size > maxSize) {
            return { valid: false, message: 'Image size should be less than 15MB.' }
        }
        return { valid: true, message: '' }
    }

    return {
        isProcessing,
        progress,
        statusMessage,
        activeEngineUsed,
        error,
        ocrEngine,
        extractTextFromImage,
        extractTextFromMultipleImages,
        validateImage,
        terminateWorker
    }
}