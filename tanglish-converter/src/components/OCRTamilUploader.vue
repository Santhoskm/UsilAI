<!-- File: src/components/OCRTamilUploader.vue -->
<template>
  <div class="ocr-uploader">
    <div class="ocr-header">
      <h3>📷 Tamil Image to Text (OCR)</h3>
      <p class="ocr-description">
        Upload Tamil text images to extract and convert to editable text
      </p>
    </div>

    <!-- Upload Area -->
    <div 
      class="upload-area"
      :class="{ 'drag-over': isDragOver, 'processing': isProcessing }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/bmp"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
      
      <div v-if="!isProcessing && !extractedText">
        <div class="upload-icon"></div>
        <div class="upload-text">
          Click or drag & drop Tamil image(s) here
        </div>
        <div class="upload-hint">
          Supports JPG, PNG, WEBP, BMP (max 10MB per image)
        </div>
      </div>

      <div v-if="isProcessing" class="processing-status">
        <div class="spinner"></div>
        <div class="processing-text">Processing image...</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <div class="progress-text">{{ progress }}%</div>
      </div>

      <div v-if="extractedText && !isProcessing" class="extracted-preview">
        <div class="preview-header">
          <span>📄 Extracted Text</span>
          <button @click.stop="clearExtracted" class="clear-btn">Clear</button>
        </div>
        <div class="extracted-text">{{ extractedText }}</div>
        <button @click.stop="insertToEditor" class="insert-btn">
          Insert to Editor
        </button>
      </div>
    </div>

    <!-- Selected Files Preview -->
    <div v-if="selectedFiles.length > 0 && !isProcessing && !extractedText" class="selected-files">
      <div class="files-header">
        <span>Selected Images ({{ selectedFiles.length }})</span>
        <button @click="clearFiles" class="clear-files-btn">Clear All</button>
      </div>
      <div class="file-list">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <img :src="getFilePreview(file)" :alt="file.name" class="file-preview" />
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-size">{{ formatFileSize(file.size) }}</div>
          </div>
          <button @click="removeFile(index)" class="remove-file">✕</button>
        </div>
      </div>
      <button @click="processSelectedFiles" class="process-btn" :disabled="isProcessing">
        {{ isProcessing ? 'Processing...' : `Extract Text from ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}` }}
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      ⚠️ {{ error }}
    </div>

    <!-- Tips -->
    <div class="ocr-tips">
      <h4>💡 Tips for better results:</h4>
      <ul>
        <li>Use clear, well-lit images</li>
        <li>Ensure text is horizontal and not skewed</li>
        <li>Avoid blurry or low-resolution images</li>
        <li>Use high contrast (dark text on light background)</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTamilOCR } from '@/composables/useTamilOCR'

const emit = defineEmits(['text-extracted'])

const { 
    isProcessing, 
    progress, 
    error, 
    extractTextFromImage,
    extractTextFromMultipleImages,
    validateImage,
    terminateWorker
} = useTamilOCR()

const fileInput = ref(null)
const isDragOver = ref(false)
const selectedFiles = ref([])
const extractedText = ref('')

const handleDragOver = (e) => {
    isDragOver.value = true
}

const handleDrop = (e) => {
    isDragOver.value = false
    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
}

const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    addFiles(files)
    fileInput.value.value = '' // Reset input
}

const addFiles = (files) => {
    const validFiles = files.filter(file => {
        const validation = validateImage(file)
        if (!validation.valid) {
            error.value = validation.message
            return false
        }
        return true
    })
    
    selectedFiles.value.push(...validFiles)
    error.value = null
}

const removeFile = (index) => {
    selectedFiles.value.splice(index, 1)
}

const clearFiles = () => {
    selectedFiles.value = []
    extractedText.value = ''
    error.value = null
}

const getFilePreview = (file) => {
    return URL.createObjectURL(file)
}

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const processSelectedFiles = async () => {
    if (selectedFiles.value.length === 0) return
    
    let text = ''
    if (selectedFiles.value.length === 1) {
        text = await extractTextFromImage(selectedFiles.value[0])
    } else {
        text = await extractTextFromMultipleImages(selectedFiles.value)
    }
    
    if (text) {
        extractedText.value = text
    }
}

const triggerFileInput = () => {
    if (!isProcessing.value && !extractedText.value) {
        fileInput.value.click()
    }
}

const clearExtracted = () => {
    extractedText.value = ''
    clearFiles()
}

const insertToEditor = () => {
    if (extractedText.value) {
        emit('text-extracted', extractedText.value)
        clearExtracted()
    }
}

// Clean up on unmount
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
    terminateWorker()
})
</script>

<style scoped>
.ocr-uploader {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin: 12px 20px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.ocr-header h3 {
  margin: 0 0 8px 0;
  color: #1a1a2e;
  font-size: 18px;
}

.ocr-description {
  color: #666;
  font-size: 13px;
  margin: 0 0 16px 0;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #6c47ff;
  background: #f5f3ff;
}

.upload-area.drag-over {
  border-color: #6c47ff;
  background: #f0edff;
}

.upload-area.processing {
  cursor: default;
  opacity: 0.8;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.processing-status {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0edff;
  border-top-color: #6c47ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-text {
  color: #6c47ff;
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
}

.progress-fill {
  height: 100%;
  background: #6c47ff;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #666;
}

.extracted-preview {
  text-align: left;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.extracted-text {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  font-family: 'Noto Sans Tamil', monospace;
  font-size: 16px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.clear-btn, .insert-btn, .process-btn, .clear-files-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.clear-btn {
  background: #ff4757;
  color: white;
}

.clear-btn:hover {
  background: #e0333f;
}

.insert-btn, .process-btn {
  background: #6c47ff;
  color: white;
  width: 100%;
}

.insert-btn:hover, .process-btn:hover {
  background: #5835e0;
}

.process-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selected-files {
  margin-top: 16px;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.clear-files-btn {
  background: #ddd;
  color: #666;
  padding: 4px 12px;
  font-size: 12px;
}

.clear-files-btn:hover {
  background: #ccc;
}

.file-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
}

.file-item:last-child {
  border-bottom: none;
}

.file-preview {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
}

.file-size {
  font-size: 11px;
  color: #999;
}

.remove-file {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
}

.remove-file:hover {
  color: #ff4757;
}

.error-message {
  margin-top: 12px;
  padding: 10px;
  background: #ffe0e0;
  color: #d32f2f;
  border-radius: 6px;
  font-size: 13px;
}

.ocr-tips {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
}

.ocr-tips h4 {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 13px;
}

.ocr-tips ul {
  margin: 0;
  padding-left: 20px;
}

.ocr-tips li {
  color: #888;
  margin: 4px 0;
}

@media (max-width: 768px) {
  .ocr-uploader {
    margin: 8px 12px;
    padding: 16px;
  }
  
  .upload-area {
    padding: 24px;
  }
  
  .extracted-text {
    font-size: 14px;
  }
}
</style>