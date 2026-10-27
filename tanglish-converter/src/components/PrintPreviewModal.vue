<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="split-print-modal" role="dialog" aria-modal="true">
        <!-- Header -->
        <header class="modal-header">
          <div class="header-branding">
            <div class="header-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </div>
            <div>
              <h2 class="header-title">Print & Download</h2>
              <p class="header-subtitle">Edit text & settings on the left • Live A4 preview on the right</p>
            </div>
          </div>

          <button @click="closeModal" class="btn-close-modal" aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <!-- Split Body: Left = Editing & Settings | Right = A4 Preview -->
        <div class="modal-split-body">
          <!-- LEFT: Editing & Controls Panel -->
          <div class="left-edit-panel">
            <!-- Section: Document Content Editing -->
            <div class="panel-section edit-section">
              <div class="section-header">
                <span class="section-title">Edit Document</span>
                <span class="section-tag">Live Sync</span>
              </div>

              <!-- Title Input -->
              <div class="field-group">
                <label class="field-label">Document Title</label>
                <input 
                  type="text"
                  v-model="previewTitle"
                  class="edit-title-input"
                  placeholder="Enter document title..."
                  @input="onTitleEdited"
                />
              </div>

              <!-- Content Editor Area -->
              <div class="field-group content-field">
                <div class="field-label-row">
                  <label class="field-label">Content</label>
                  <span class="edit-hint">Click & type below to edit</span>
                </div>
                <div 
                  ref="leftEditorRef"
                  contenteditable="true"
                  class="left-content-editor"
                  @input="onLeftEditorInput"
                  spellcheck="false"
                  placeholder="Type your document content here..."
                ></div>
              </div>
            </div>

            <!-- Section: Page Layout & Settings -->
            <div class="panel-section settings-section">
              <div class="section-header">
                <span class="section-title">Page & Layout</span>
              </div>

              <div class="settings-grid">
                <!-- Orientation -->
                <div class="setting-item">
                  <label class="setting-label">Orientation</label>
                  <div class="segmented-control">
                    <button 
                      @click="previewOrientation = 'portrait'" 
                      class="seg-btn" 
                      :class="{ active: previewOrientation === 'portrait' }"
                    >
                      Portrait
                    </button>
                    <button 
                      @click="previewOrientation = 'landscape'" 
                      class="seg-btn" 
                      :class="{ active: previewOrientation === 'landscape' }"
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                <!-- Margins -->
                <div class="setting-item">
                  <label class="setting-label">Margins</label>
                  <div class="segmented-control">
                    <button 
                      @click="previewMargin = 'compact'" 
                      class="seg-btn" 
                      :class="{ active: previewMargin === 'compact' }"
                    >
                      Narrow
                    </button>
                    <button 
                      @click="previewMargin = 'normal'" 
                      class="seg-btn" 
                      :class="{ active: previewMargin === 'normal' }"
                    >
                      Normal
                    </button>
                    <button 
                      @click="previewMargin = 'wide'" 
                      class="seg-btn" 
                      :class="{ active: previewMargin === 'wide' }"
                    >
                      Wide
                    </button>
                  </div>
                </div>

                <!-- Font Size Stepper -->
                <div class="setting-item">
                  <label class="setting-label">Font Size</label>
                  <div class="stepper-box">
                    <button @click="decreaseFontSize" class="stepper-btn" :disabled="previewFontSize <= 12">−</button>
                    <span class="stepper-val">{{ previewFontSize }}px</span>
                    <button @click="increaseFontSize" class="stepper-btn" :disabled="previewFontSize >= 28">+</button>
                  </div>
                </div>

                <!-- Background toggle (if present) -->
                <div v-if="docBackground" class="setting-item">
                  <label class="setting-label">Watermark</label>
                  <label class="checkbox-toggle">
                    <input type="checkbox" v-model="previewIncludeBackground" />
                    <span>Include Background</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Sync Edits Reminder Bar -->
            <div v-if="hasUnsyncedEdits" class="sync-banner">
              <span class="sync-banner-text">💡 Edits made in preview</span>
              <button @click="applyEditsToEditor" class="btn-save-sync">
                Save to Document
              </button>
            </div>

            <!-- Export & Action Buttons -->
            <div class="panel-actions">
              <div class="secondary-exports">
                <button @click="downloadAsWord" class="btn-export-alt btn-word" title="Download formatted Word document">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>Word (.doc)</span>
                </button>

                <button @click="downloadAsTxt" class="btn-export-alt btn-txt" title="Download plain text file">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span>Text (.txt)</span>
                </button>
              </div>

              <button @click="printDocument" class="btn-primary-print" title="Print document or save as PDF">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          <!-- RIGHT: A4 Live Sheet Preview Panel -->
          <div class="right-preview-panel">
            <!-- Stage Top Bar: Controls & Zoom -->
            <div class="stage-topbar">
              <span class="preview-badge">A4 Sheet Preview</span>
              <div class="zoom-stepper">
                <button @click="zoomOut" class="btn-zoom" :disabled="zoomLevel <= 60" title="Zoom Out">−</button>
                <span class="zoom-text">{{ zoomLevel }}%</span>
                <button @click="zoomIn" class="btn-zoom" :disabled="zoomLevel >= 140" title="Zoom In">+</button>
                <button @click="resetZoom" class="btn-zoom-reset" title="Reset Zoom">Reset</button>
              </div>
            </div>

            <!-- Scrollable Stage Canvas -->
            <div class="stage-canvas">
              <div 
                class="a4-physical-sheet"
                :class="[
                  `margin-${previewMargin}`, 
                  `orientation-${previewOrientation}`,
                  { 'with-bg': previewIncludeBackground && docBackground }
                ]"
                :style="sheetContainerStyle"
              >
                <!-- Background Layer -->
                <div 
                  v-if="previewIncludeBackground && docBackground" 
                  class="sheet-bg-layer"
                  :style="sheetBgStyle"
                ></div>

                <!-- Sheet Header -->
                <div class="sheet-header-block">
                  <div class="sheet-title-text">{{ previewTitle || 'Tamil Document' }}</div>
                  <div class="sheet-date-text">{{ currentDateStr }}</div>
                </div>
                <div class="sheet-divider"></div>

                <!-- Sheet Content (Live Display synced with left editor) -->
                <div 
                  ref="rightSheetRef"
                  class="sheet-content-render"
                  :style="sheetTextStyle"
                  contenteditable="true"
                  @input="onRightSheetInput"
                  spellcheck="false"
                  title="Directly editable preview"
                ></div>

                <!-- Sheet Footer -->
                <div class="sheet-footer-block">
                  <span>Created with Usil AI (Tanglish to Tamil)</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialTitle: {
    type: String,
    default: 'Tamil Document'
  },
  initialContent: {
    type: String,
    default: ''
  },
  docBackground: {
    type: String,
    default: ''
  },
  docBackgroundMode: {
    type: String,
    default: 'cover'
  },
  docBackgroundOpacity: {
    type: Number,
    default: 0.2
  },
  selectedFont: {
    type: Object,
    default: () => ({ label: 'Noto Sans Tamil', value: "'Noto Sans Tamil', sans-serif" })
  },
  fontSize: {
    type: Number,
    default: 16
  }
})

const emit = defineEmits(['close', 'apply-changes', 'download-docx', 'download-txt'])

const leftEditorRef = ref(null)
const rightSheetRef = ref(null)

const previewTitle = ref('')
const previewFontSize = ref(16)
const previewMargin = ref('normal') // 'compact' | 'normal' | 'wide'
const previewOrientation = ref('portrait') // 'portrait' | 'landscape'
const previewIncludeBackground = ref(true)
const zoomLevel = ref(90)
const hasUnsyncedEdits = ref(false)

const currentDateStr = computed(() => {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

const sheetContainerStyle = computed(() => ({
  transform: `scale(${zoomLevel.value / 100})`,
  transformOrigin: 'top center'
}))

const sheetTextStyle = computed(() => ({
  fontFamily: props.selectedFont?.value || "'Noto Sans Tamil', sans-serif",
  fontSize: `${previewFontSize.value}px`
}))

const sheetBgStyle = computed(() => {
  if (!props.docBackground) return {}
  const bgVal = props.docBackground.startsWith('linear-gradient') ? props.docBackground : `url('${props.docBackground}')`
  return {
    backgroundImage: bgVal,
    opacity: props.docBackgroundOpacity ?? 0.2,
    backgroundSize: props.docBackgroundMode === 'contain' ? 'contain' : (props.docBackgroundMode === 'repeat' ? 'auto' : 'cover'),
    backgroundRepeat: props.docBackgroundMode === 'repeat' ? 'repeat' : 'no-repeat',
    backgroundPosition: 'center'
  }
})

// Zoom Controls
const zoomIn = () => {
  if (zoomLevel.value < 140) zoomLevel.value += 10
}
const zoomOut = () => {
  if (zoomLevel.value > 60) zoomLevel.value -= 10
}
const resetZoom = () => {
  zoomLevel.value = 90
}

// Font Size Controls
const increaseFontSize = () => {
  if (previewFontSize.value < 28) previewFontSize.value += 2
}
const decreaseFontSize = () => {
  if (previewFontSize.value > 12) previewFontSize.value -= 2
}

// Synchronize inputs between left editor and right A4 sheet
const onTitleEdited = () => {
  hasUnsyncedEdits.value = true
}

const onLeftEditorInput = () => {
  hasUnsyncedEdits.value = true
  if (leftEditorRef.value && rightSheetRef.value) {
    rightSheetRef.value.innerHTML = leftEditorRef.value.innerHTML
  }
}

const onRightSheetInput = () => {
  hasUnsyncedEdits.value = true
  if (leftEditorRef.value && rightSheetRef.value) {
    leftEditorRef.value.innerHTML = rightSheetRef.value.innerHTML
  }
}

const applyEditsToEditor = () => {
  const finalHtml = leftEditorRef.value ? leftEditorRef.value.innerHTML : (props.initialContent || '')
  emit('apply-changes', {
    title: previewTitle.value.trim() || 'Tamil Document',
    content: finalHtml
  })
  hasUnsyncedEdits.value = false
}

const closeModal = () => {
  emit('close')
}

// When modal opens, initialize both left and right editors
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    previewTitle.value = props.initialTitle || 'Tamil Document'
    previewFontSize.value = props.fontSize || 16
    previewMargin.value = 'normal'
    previewOrientation.value = 'portrait'
    previewIncludeBackground.value = Boolean(props.docBackground)
    zoomLevel.value = 90
    hasUnsyncedEdits.value = false

    await nextTick()
    const content = props.initialContent || '<p>Start writing in Tanglish...</p>'
    if (leftEditorRef.value) {
      leftEditorRef.value.innerHTML = content
    }
    if (rightSheetRef.value) {
      rightSheetRef.value.innerHTML = content
    }
  }
})

// ── Print Functionality ──────────────────────────────────────────
const printDocument = () => {
  const htmlToPrint = leftEditorRef.value ? leftEditorRef.value.innerHTML : (props.initialContent || '')
  const titleToPrint = previewTitle.value || 'Tamil Document'

  const printIframe = document.createElement('iframe')
  printIframe.style.position = 'fixed'
  printIframe.style.right = '0'
  printIframe.style.bottom = '0'
  printIframe.style.width = '0'
  printIframe.style.height = '0'
  printIframe.style.border = 'none'
  document.body.appendChild(printIframe)

  const marginMap = {
    compact: '10mm',
    normal: '20mm',
    wide: '28mm'
  }
  const chosenMargin = marginMap[previewMargin.value] || '20mm'
  const chosenOrientation = previewOrientation.value === 'landscape' ? 'landscape' : 'portrait'

  let bgCss = ''
  if (previewIncludeBackground.value && props.docBackground) {
    const bgVal = props.docBackground.startsWith('linear-gradient') ? props.docBackground : `url('${props.docBackground}')`
    const bgSize = props.docBackgroundMode === 'contain' ? 'contain' : (props.docBackgroundMode === 'repeat' ? 'auto' : 'cover')
    const bgRepeat = props.docBackgroundMode === 'repeat' ? 'repeat' : 'no-repeat'
    bgCss = `
      background-image: ${bgVal};
      background-size: ${bgSize};
      background-repeat: ${bgRepeat};
      background-position: center;
      opacity: ${props.docBackgroundOpacity ?? 0.2};
    `
  }

  const doc = printIframe.contentWindow.document
  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${titleToPrint}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Catamaran:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;500;700&family=Noto+Serif+Tamil:wght@400;700&family=Mukta+Malar:wght@400;600&display=swap" rel="stylesheet">
        <style>
          @page {
            margin: ${chosenMargin};
            size: A4 ${chosenOrientation};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: ${props.selectedFont?.value || "'Noto Sans Tamil', sans-serif"};
            font-size: ${previewFontSize.value}px;
            line-height: 1.8;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: white;
            position: relative;
          }
          .print-bg-layer {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: -1;
            ${bgCss}
          }
          .print-header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 24px;
          }
          .print-title {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .print-content {
            min-height: 200px;
          }
          .print-content h1 { font-size: 24px; margin-top: 1.2em; margin-bottom: 0.5em; color: #0f172a; }
          .print-content h2 { font-size: 20px; margin-top: 1.1em; margin-bottom: 0.4em; color: #0f172a; }
          .print-content h3 { font-size: 18px; margin-top: 1em; margin-bottom: 0.3em; color: #0f172a; }
          .print-content p { margin: 0.8em 0; }
          .print-content blockquote { border-left: 3px solid #6366f1; margin: 1em 0; padding-left: 14px; color: #475569; font-style: italic; }
          .print-content code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
          .print-content img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            margin: 12px 0;
          }
          .print-footer {
            margin-top: 48px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        ${previewIncludeBackground.value && bgCss ? '<div class="print-bg-layer"></div>' : ''}
        <div class="print-header">
          <h1 class="print-title">${titleToPrint}</h1>
        </div>
        <div class="print-content">${htmlToPrint}</div>
        <div class="print-footer">
          <span>Created with Usil AI (Tanglish to Tamil)</span>
          <span>${new Date().toLocaleDateString()}</span>
        </div>
      </body>
    </html>
  `)
  doc.close()

  setTimeout(() => {
    printIframe.contentWindow.focus()
    printIframe.contentWindow.print()
    setTimeout(() => {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe)
      }
    }, 2500)
  }, 400)
}

// ── Export as Word (.doc) ───────────────────────────────────────
const downloadAsWord = () => {
  const htmlToPrint = leftEditorRef.value ? leftEditorRef.value.innerHTML : (props.initialContent || '')
  const titleToPrint = previewTitle.value || 'Tamil Document'
  const cleanTitle = titleToPrint.replace(/[\\/:*?"<>|]/g, '_').trim() || 'tamil_document'

  const htmlDocument = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${titleToPrint}</title>
        <style>
          body {
            font-family: ${props.selectedFont?.value || "'Noto Sans Tamil', 'Arial Unicode MS', sans-serif"};
            font-size: ${previewFontSize.value || 14}pt;
            line-height: 1.8;
            color: #000000;
          }
          h1 { font-size: 20pt; color: #0f172a; margin-bottom: 8pt; }
          h2 { font-size: 16pt; color: #0f172a; margin-bottom: 6pt; }
          h3 { font-size: 14pt; color: #0f172a; margin-bottom: 4pt; }
          blockquote { margin: 12pt 0; padding-left: 12pt; border-left: 3pt solid #6366f1; color: #555555; }
        </style>
      </head>
      <body>
        <h1>${titleToPrint}</h1>
        <div>${htmlToPrint}</div>
      </body>
    </html>
  `
  const blob = new Blob(['\ufeff' + htmlDocument], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cleanTitle}_${Date.now()}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Export as Plain Text (.txt) ─────────────────────────────────
const downloadAsTxt = () => {
  const textContent = leftEditorRef.value ? leftEditorRef.value.innerText : ''
  const titleToPrint = previewTitle.value || 'Tamil Document'
  const cleanTitle = titleToPrint.replace(/[\\/:*?"<>|]/g, '_').trim() || 'tamil_document'

  const fullText = `${titleToPrint}\n${'='.repeat(Math.max(12, titleToPrint.length))}\n\n${textContent}\n\n---\nCreated with Usil AI\n`
  const blob = new Blob(['\ufeff' + fullText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cleanTitle}_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* Backdrop */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Split Modal (Centered, Medium-sized, Beautiful Proportions) */
.split-print-modal {
  width: 94%;
  max-width: 1040px;
  height: 86vh;
  max-height: 720px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  color: #0f172a;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  flex-shrink: 0;
}

.header-branding {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.25;
}

.header-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0 0;
  line-height: 1.2;
}

.btn-close-modal {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f8fafc;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close-modal:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Split Body */
.modal-split-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #ffffff;
}

/* ── LEFT: Editing Panel ─────────────────────────────────── */
.left-edit-panel {
  width: 48%;
  min-width: 360px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #ffffff;
  padding: 16px 20px;
  gap: 14px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-tag {
  font-size: 10px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  padding: 2px 8px;
  border-radius: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.edit-hint {
  font-size: 11px;
  color: #94a3b8;
}

.edit-title-input {
  width: 100%;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  transition: all 0.15s ease;
}

.edit-title-input:focus {
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.content-field {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.left-content-editor {
  flex: 1;
  min-height: 140px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #0f172a;
  outline: none;
  transition: all 0.15s ease;
  word-break: break-word;
}

.left-content-editor:focus {
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.left-content-editor :deep(h1) { font-size: 1.3em; margin: 0.5em 0 0.2em; }
.left-content-editor :deep(h2) { font-size: 1.15em; margin: 0.4em 0 0.2em; }
.left-content-editor :deep(p) { margin: 0.3em 0; }
.left-content-editor :deep(img) { max-width: 100%; height: auto; border-radius: 4px; margin: 6px 0; }

/* Settings Grid */
.settings-section {
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.setting-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.segmented-control {
  display: flex;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 2px;
  border-radius: 7px;
}

.seg-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 500;
  color: #475569;
  border-radius: 5px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.seg-btn.active {
  background: #ffffff;
  color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.stepper-box {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 2px;
  border-radius: 7px;
  width: fit-content;
}

.stepper-btn {
  border: none;
  background: transparent;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.stepper-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stepper-val {
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.checkbox-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  padding-top: 4px;
}

.checkbox-toggle input {
  accent-color: #4f46e5;
}

/* Sync Banner */
.sync-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
}

.sync-banner-text {
  font-size: 12px;
  font-weight: 500;
  color: #065f46;
}

.btn-save-sync {
  border: none;
  background: #10b981;
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-save-sync:hover {
  background: #059669;
}

/* Panel Actions */
.panel-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}

.secondary-exports {
  display: flex;
  gap: 8px;
}

.btn-export-alt {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-word {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
}

.btn-word:hover {
  background: #dbeafe;
}

.btn-txt {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.btn-txt:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-primary-print {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  transition: all 0.15s ease;
}

.btn-primary-print:hover {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
  transform: translateY(-1px);
}

/* ── RIGHT: A4 Sheet Preview Panel ───────────────────────── */
.right-preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  overflow: hidden;
}

.stage-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #e2e8f0;
  border-bottom: 1px solid #cbd5e1;
}

.preview-badge {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.zoom-stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-zoom {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-zoom:hover:not(:disabled) {
  background: #f8fafc;
  color: #0f172a;
}

.btn-zoom:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-text {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  padding: 0 4px;
}

.btn-zoom-reset {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
}

.btn-zoom-reset:hover {
  background: #f8fafc;
  color: #0f172a;
}

/* Canvas Stage */
.stage-canvas {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 24px 16px;
  display: flex;
  justify-content: center;
  background: #e2e8f0;
}

/* Realistic A4 Physical Sheet */
.a4-physical-sheet {
  position: relative;
  width: 100%;
  max-width: 480px;
  min-height: 520px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  color: #0f172a;
  line-height: 1.7;
  overflow: hidden;
  transition: width 0.2s, max-width 0.2s;
}

.a4-physical-sheet.margin-compact {
  padding: 20px;
}
.a4-physical-sheet.margin-normal {
  padding: 28px;
}
.a4-physical-sheet.margin-wide {
  padding: 36px;
}

.a4-physical-sheet.orientation-landscape {
  max-width: 580px;
  min-height: 380px;
}

.sheet-bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.sheet-header-block {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.sheet-title-text {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.sheet-date-text {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.sheet-divider {
  position: relative;
  z-index: 1;
  height: 1px;
  background: #e2e8f0;
  margin-bottom: 14px;
}

.sheet-content-render {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 240px;
  outline: none;
  word-break: break-word;
}

.sheet-content-render:hover {
  outline: 1px dashed #cbd5e1;
  border-radius: 4px;
}

.sheet-content-render :deep(h1) { font-size: 1.4em; margin: 0.6em 0 0.3em; color: #0f172a; }
.sheet-content-render :deep(h2) { font-size: 1.25em; margin: 0.5em 0 0.25em; color: #0f172a; }
.sheet-content-render :deep(h3) { font-size: 1.1em; margin: 0.4em 0 0.2em; color: #0f172a; }
.sheet-content-render :deep(p) { margin: 0.4em 0; }
.sheet-content-render :deep(blockquote) {
  border-left: 3px solid #6366f1;
  margin: 0.6em 0;
  padding-left: 10px;
  color: #475569;
  font-style: italic;
}
.sheet-content-render :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

.sheet-footer-block {
  position: relative;
  z-index: 1;
  margin-top: 24px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  font-size: 10px;
  color: #94a3b8;
  display: flex;
  justify-content: space-between;
}

/* Responsive for smaller screens */
@media (max-width: 768px) {
  .modal-split-body {
    flex-direction: column;
  }
  .left-edit-panel {
    width: 100%;
    min-width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  .right-preview-panel {
    min-height: 300px;
  }
}
</style>
