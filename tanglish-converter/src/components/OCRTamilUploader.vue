<template>
  <div class="ocr-uploader-card">
    <!-- Header -->
    <div class="ocr-card-header">
      <div class="header-left">
        <div class="header-icon">📷</div>
        <div>
          <h3>Tamil OCR Text Extraction</h3>
          <p class="subtitle">Extract Tamil & English text from photos, documents, and book pages</p>
        </div>
      </div>

      <!-- Engine Selector -->
      <div class="engine-selector">
        <button 
          class="engine-btn" 
          :class="{ active: ocrEngine === 'ai' }"
          @click="ocrEngine = 'ai'"
          title="Claude Vision AI — Ultra-high accuracy for complex & printed text"
        >
          <span class="engine-dot ai"></span>
          AI Vision (High Accuracy)
        </button>
        <button 
          class="engine-btn" 
          :class="{ active: ocrEngine === 'tesseract' }"
          @click="ocrEngine = 'tesseract'"
          title="Local Tesseract — Runs in browser"
        >
          <span class="engine-dot local"></span>
          Local Tesseract
        </button>
      </div>
    </div>

    <!-- Upload Dropzone (When no text has been extracted yet) -->
    <div 
      v-if="!extractedText && !isProcessing"
      class="upload-dropzone"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/bmp"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
      
      <div class="dropzone-content">
        <div class="upload-illustration">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="dropzone-title">Click or drag & drop Tamil images here</div>
        <div class="dropzone-hint">Supports JPG, PNG, WEBP, BMP up to 15MB</div>
      </div>
    </div>

    <!-- Processing / Loading State -->
    <div v-if="isProcessing" class="ocr-loading-card">
      <div class="loading-ring-wrapper">
        <div class="loading-ring"></div>
        <span class="loading-percent">{{ progress }}%</span>
      </div>
      <div class="loading-stage-text">{{ statusMessage || 'Analyzing image characters...' }}</div>
      <div class="progress-track">
        <div class="progress-fill-bar" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- Selected Files Queue (Before Processing) -->
    <div v-if="selectedFiles.length > 0 && !isProcessing && !extractedText" class="files-preview-section">
      <div class="files-heading">
        <span>Selected Images ({{ selectedFiles.length }})</span>
        <button @click="clearFiles" class="btn-clear-all">Clear All</button>
      </div>

      <div class="thumbnails-grid">
        <div v-for="(file, index) in selectedFiles" :key="index" class="thumbnail-card">
          <img :src="getFilePreview(file)" :alt="file.name" class="thumb-img" />
          <div class="thumb-info">
            <span class="thumb-name">{{ file.name }}</span>
            <span class="thumb-size">{{ formatFileSize(file.size) }}</span>
          </div>
          <button @click.stop="removeFile(index)" class="btn-thumb-remove" title="Remove">✕</button>
        </div>
      </div>

      <div class="action-row">
        <button @click="processSelectedFiles" class="btn-run-ocr" :disabled="isProcessing">
          ✨ Extract Tamil Text ({{ selectedFiles.length }})
        </button>
      </div>
    </div>

    <!-- Extracted Result Preview & Editor -->
    <div v-if="extractedText && !isProcessing" class="extracted-result-box">
      <div class="result-toolbar">
        <div class="result-meta">
          <span class="badge-success">✓ {{ activeEngineUsed }}</span>
          <span class="meta-stat">{{ wordCount }} words</span>
          <span class="meta-stat">{{ charCount }} characters</span>
        </div>

        <div class="result-actions">
          <button @click="copyExtractedText" class="btn-action-tool" :class="{ copied: isCopied }">
            <span v-if="!isCopied">📋 Copy Text</span>
            <span v-else>✓ Copied!</span>
          </button>
          <button @click="insertToEditor" class="btn-action-primary">
            🚀 Open in Tanglish Editor →
          </button>
          <button @click="clearExtracted" class="btn-action-ghost" title="Extract Another Image">
            ✕ Clear
          </button>
        </div>
      </div>

      <!-- Editable Extracted Textarea -->
      <div class="textarea-wrapper">
        <textarea
          v-model="extractedText"
          class="extracted-textarea"
          rows="8"
          placeholder="Extracted Tamil text will appear here..."
        ></textarea>
      </div>

      <div class="result-footer-hint">
        💡 You can edit and format the text above directly or click <strong>Open in Tanglish Editor</strong> to use formatting and AI grammar corrections.
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="ocr-error-banner">
      ⚠️ {{ error }}
    </div>

    <!-- Help / Best Practices -->
    <div class="ocr-footer-tips">
      <div class="tips-title">💡 For Best Accuracy:</div>
      <div class="tips-grid">
        <div class="tip-chip">✓ Well-lit, high-contrast images</div>
        <div class="tip-chip">✓ Keep text straight & unskewed</div>
        <div class="tip-chip">✓ Avoid heavy shadows or motion blur</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useTamilOCR } from '@/composables/useTamilOCR'

const router = useRouter()
const emit = defineEmits(['text-extracted'])

const { 
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
} = useTamilOCR()

const fileInputRef = ref(null)
const isDragOver = ref(false)
const selectedFiles = ref([])
const extractedText = ref('')
const isCopied = ref(false)

const wordCount = computed(() => {
  if (!extractedText.value) return 0
  return extractedText.value.trim().split(/\s+/).filter(Boolean).length
})

const charCount = computed(() => {
  return extractedText.value ? extractedText.value.length : 0
})

const triggerFileInput = () => {
  if (!isProcessing.value && !extractedText.value) {
    fileInputRef.value?.click()
  }
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  addFiles(files)
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const handleDrop = (e) => {
  isDragOver.value = false
  const files = Array.from(e.dataTransfer.files)
  addFiles(files)
}

const addFiles = (files) => {
  const validFiles = files.filter(file => {
    const val = validateImage(file)
    if (!val.valid) {
      error.value = val.message
      return false
    }
    return true
  })
  
  if (validFiles.length > 0) {
    selectedFiles.value.push(...validFiles)
    error.value = null
  }
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const clearFiles = () => {
  selectedFiles.value = []
  error.value = null
}

const clearExtracted = () => {
  extractedText.value = ''
  clearFiles()
}

const getFilePreview = (file) => {
  return URL.createObjectURL(file)
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
    emit('text-extracted', text)
  }
}

const copyExtractedText = async () => {
  if (!extractedText.value) return
  try {
    await navigator.clipboard.writeText(extractedText.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Clipboard copy failed:', err)
  }
}

const insertToEditor = () => {
  if (extractedText.value) {
    sessionStorage.setItem('usil_imported_text', extractedText.value)
    emit('text-extracted', extractedText.value)
    router.push('/editor')
  }
}

onBeforeUnmount(() => {
  terminateWorker()
})
</script>

<style scoped>
.ocr-uploader-card {
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.ocr-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  background: #f1f5f9;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ocr-card-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.engine-selector {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 100px;
  gap: 4px;
}

.engine-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.engine-btn.active {
  background: white;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.engine-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.engine-dot.ai {
  background: #6366f1;
}

.engine-dot.local {
  background: #10b981;
}

.upload-dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 20px;
  padding: 50px 24px;
  text-align: center;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-dropzone:hover,
.upload-dropzone.drag-over {
  border-color: #6366f1;
  background: #eef2ff;
  transform: translateY(-2px);
}

.upload-illustration {
  color: #6366f1;
  margin-bottom: 12px;
}

.dropzone-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
}

.dropzone-hint {
  font-size: 13px;
  color: #64748b;
}

/* Loading Card */
.ocr-loading-card {
  padding: 48px 24px;
  text-align: center;
  background: #f8fafc;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
}

.loading-ring-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-ring {
  width: 80px;
  height: 80px;
  border: 4px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-percent {
  position: absolute;
  font-size: 14px;
  font-weight: 700;
  color: #6366f1;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-stage-text {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.progress-track {
  width: 100%;
  max-width: 400px;
  height: 8px;
  background: #e2e8f0;
  border-radius: 100px;
  margin: 0 auto;
  overflow: hidden;
}

.progress-fill-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  transition: width 0.3s ease;
}

/* Files Preview */
.files-preview-section {
  margin-top: 20px;
}

.files-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.btn-clear-all {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.thumbnail-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  position: relative;
}

.thumb-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
}

.thumb-info {
  flex: 1;
  min-width: 0;
}

.thumb-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thumb-size {
  font-size: 11px;
  color: #64748b;
}

.btn-thumb-remove {
  background: #e2e8f0;
  border: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  font-size: 11px;
}

.btn-thumb-remove:hover {
  background: #fee2e2;
  color: #ef4444;
}

.btn-run-ocr {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
}

.btn-run-ocr:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

/* Result Box */
.extracted-result-box {
  background: #f8fafc;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  padding: 24px;
}

.result-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-success {
  font-size: 12px;
  font-weight: 600;
  background: #dcfce7;
  color: #166534;
  padding: 4px 10px;
  border-radius: 100px;
}

.meta-stat {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-action-tool {
  padding: 8px 14px;
  background: white;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-tool.copied {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
}

.btn-action-primary {
  padding: 8px 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  transition: all 0.2s;
}

.btn-action-primary:hover {
  transform: translateY(-1px);
}

.btn-action-ghost {
  padding: 8px 12px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
}

.textarea-wrapper {
  margin-bottom: 12px;
}

.extracted-textarea {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  line-height: 1.8;
  color: #0f172a;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.extracted-textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.result-footer-hint {
  font-size: 12px;
  color: #64748b;
}

.ocr-error-banner {
  margin-top: 16px;
  background: #fef2f2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #fee2e2;
  font-size: 13px;
}

.ocr-footer-tips {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

.tips-title {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.tips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tip-chip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 640px) {
  .ocr-uploader-card {
    padding: 20px 16px;
  }
  .ocr-card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .result-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .result-actions {
    width: 100%;
    flex-direction: column;
  }
  .btn-action-primary, .btn-action-tool {
    width: 100%;
    text-align: center;
  }
}
</style>