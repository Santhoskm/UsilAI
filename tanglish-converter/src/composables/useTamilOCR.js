import { ref } from 'vue'
import { createWorker } from 'tesseract.js'
import { extractTamilOCRAI } from '@/services/apiService'

export function useTamilOCR() {
    const isProcessing = ref(false)
    const progress = ref(0)
    const statusMessage = ref('')
    const error = ref(null)
    const ocrEngine = ref('ai') // 'ai' (Claude Vision) or 'tesseract' (Local)

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

    // AI Vision OCR using Backend Claude Service
    const extractWithClaudeVision = async (imageFile) => {
        statusMessage.value = 'Preparing image for Claude AI Vision...'
        progress.value = 25

        const { base64, mimeType } = await fileToBase64(imageFile)

        statusMessage.value = 'Claude AI Vision is reading Tamil characters...'
        progress.value = 60

        const data = await extractTamilOCRAI({ imageBase64: base64, mimeType })

        progress.value = 95
        statusMessage.value = 'Formatting extracted text...'

        return cleanExtractedText(data.text || '')
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