import { ref } from 'vue'
import { createWorker } from 'tesseract.js'

export function useTamilOCR() {
    const isProcessing = ref(false)
    const progress = ref(0)
    const error = ref(null)

    let worker = null

    // Initialize Tesseract worker with Tamil language support
    const initWorker = async () => {
        if (worker) return worker

        worker = await createWorker('tam', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    progress.value = Math.round(m.progress * 100)
                }
            }
        })

        // Configure for Tamil language
        await worker.setParameters({
            tessedit_pageseg_mode: '6', // Assume uniform text block
            preserve_interword_spaces: '1'
        })

        return worker
    }

    // Process image file and extract Tamil text
    const extractTextFromImage = async (imageFile) => {
        if (!imageFile) {
            error.value = 'No image file provided'
            return ''
        }

        isProcessing.value = true
        error.value = null
        progress.value = 0

        try {
            const workerInstance = await initWorker()

            // Convert to base64 or use file directly
            const imageUrl = URL.createObjectURL(imageFile)

            const { data: { text } } = await workerInstance.recognize(imageUrl)

            URL.revokeObjectURL(imageUrl)

            // Clean up the extracted text
            const cleanedText = cleanExtractedText(text)

            return cleanedText
        } catch (err) {
            console.error('OCR Error:', err)
            error.value = 'Failed to extract text from image. Please try again with a clearer image.'
            return ''
        } finally {
            isProcessing.value = false
            progress.value = 0
        }
    }

    // Process multiple images
    const extractTextFromMultipleImages = async (imageFiles) => {
        if (!imageFiles || imageFiles.length === 0) return ''

        isProcessing.value = true
        error.value = null

        let allText = ''

        try {
            const workerInstance = await initWorker()

            for (let i = 0; i < imageFiles.length; i++) {
                const imageFile = imageFiles[i]
                const imageUrl = URL.createObjectURL(imageFile)

                progress.value = Math.round((i / imageFiles.length) * 100)

                const { data: { text } } = await workerInstance.recognize(imageUrl)
                URL.revokeObjectURL(imageUrl)

                allText += cleanExtractedText(text)
                if (i < imageFiles.length - 1) allText += '\n\n'
            }

            return allText
        } catch (err) {
            console.error('OCR Error:', err)
            error.value = 'Failed to extract text from one or more images.'
            return allText
        } finally {
            isProcessing.value = false
            progress.value = 0
        }
    }

    // Clean and normalize extracted Tamil text
    const cleanExtractedText = (text) => {
        if (!text) return ''

        return text
            .replace(/[^\u0B80-\u0BFF\s\n.,!?;:()\-'"]/g, '') // Remove non-Tamil characters
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
            .replace(/[ ]{2,}/g, ' ') // Normalize spaces
            .trim()
    }

    // Terminate worker (call when component unmounts)
    const terminateWorker = async () => {
        if (worker) {
            await worker.terminate()
            worker = null
        }
    }

    // Validate if image is suitable for OCR
    const validateImage = (file) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp']
        const maxSize = 10 * 1024 * 1024 // 10MB

        if (!validTypes.includes(file.type)) {
            return { valid: false, message: 'Please upload JPEG, PNG, WEBP, or BMP images only.' }
        }

        if (file.size > maxSize) {
            return { valid: false, message: 'Image size should be less than 10MB.' }
        }

        return { valid: true, message: '' }
    }

    return {
        isProcessing,
        progress,
        error,
        extractTextFromImage,
        extractTextFromMultipleImages,
        validateImage,
        terminateWorker
    }
}