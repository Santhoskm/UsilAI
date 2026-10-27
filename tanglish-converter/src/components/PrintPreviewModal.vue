<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="compact-print-modal" role="dialog" aria-modal="true">
        <!-- Header -->
        <header class="modal-top">
          <div class="top-title-group">
            <div class="modal-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </div>
            <div>
              <h2 class="modal-heading">Print & Download</h2>
              <p class="modal-subheading">Live printable preview • Click text or title to edit</p>
            </div>
          </div>

          <button @click="closeModal" class="btn-close-modal" aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <!-- Compact Page Layout Options Bar -->
        <div class="options-strip">
          <!-- Orientation -->
          <div class="option-pill-group">
            <span class="group-label">Layout:</span>
            <div class="seg-control">
              <button 
                @click="previewOrientation = 'portrait'" 
                class="seg-pill" 
                :class="{ active: previewOrientation === 'portrait' }"
              >
                Portrait
              </button>
              <button 
                @click="previewOrientation = 'landscape'" 
                class="seg-pill" 
                :class="{ active: previewOrientation === 'landscape' }"
              >
                Landscape
              </button>
            </div>
          </div>

          <!-- Margins -->
          <div class="option-pill-group">
            <span class="group-label">Margins:</span>
            <div class="seg-control">
              <button 
                @click="previewMargin = 'compact'" 
                class="seg-pill" 
                :class="{ active: previewMargin === 'compact' }"
              >
                Narrow
              </button>
              <button 
                @click="previewMargin = 'normal'" 
                class="seg-pill" 
                :class="{ active: previewMargin === 'normal' }"
              >
                Normal
              </button>
              <button 
                @click="previewMargin = 'wide'" 
                class="seg-pill" 
                :class="{ active: previewMargin === 'wide' }"
              >
                Wide
              </button>
            </div>
          </div>

          <!-- Font Size Controls -->
          <div class="option-pill-group font-stepper-group">
            <span class="group-label">Size:</span>
            <div class="stepper-control">
              <button @click="decreaseFontSize" class="stepper-btn" :disabled="previewFontSize <= 12">−</button>
              <span class="stepper-val">{{ previewFontSize }}px</span>
              <button @click="increaseFontSize" class="stepper-btn" :disabled="previewFontSize >= 28">+</button>
            </div>
          </div>

          <!-- Watermark toggle (if background image exists) -->
          <div v-if="docBackground" class="option-pill-group bg-toggle-group">
            <label class="toggle-label" title="Toggle background watermark for printing">
              <input type="checkbox" v-model="previewIncludeBackground" class="checkbox-input" />
              <span>Background</span>
            </label>
          </div>
        </div>

        <!-- Middle Canvas & Live Editable Sheet Preview -->
        <div class="sheet-viewport">
          <div class="edit-hint-strip">
            <span class="hint-icon">✏️</span>
            <span>Click directly on the sheet below to edit text or title before printing</span>
          </div>

          <div class="sheet-scroll-wrap">
            <div 
              class="a4-preview-sheet"
              :class="[
                `margin-${previewMargin}`, 
                `orientation-${previewOrientation}`,
                { 'with-bg': previewIncludeBackground && docBackground }
              ]"
              :style="sheetStyle"
            >
              <!-- Optional Document Background Layer -->
              <div 
                v-if="previewIncludeBackground && docBackground" 
                class="sheet-bg-layer"
                :style="sheetBgStyle"
              ></div>

              <!-- Sheet Header (Editable Title) -->
              <div class="sheet-title-row">
                <input 
                  type="text"
                  v-model="previewTitle"
                  class="sheet-title-input"
                  placeholder="Document Title..."
                  title="Click to edit document title"
                  @input="onContentEdited"
                />
                <span class="sheet-date-tag">{{ currentDateStr }}</span>
              </div>
              <div class="sheet-rule"></div>

              <!-- Sheet Body (Live Contenteditable) -->
              <div 
                ref="contentAreaRef"
                contenteditable="true"
                class="sheet-content-editable"
                @input="onContentEdited"
                spellcheck="false"
                title="Click anywhere to edit content"
              ></div>

              <!-- Sheet Footer -->
              <div class="sheet-footer-row">
                <span>Created with Usil AI (Tanglish to Tamil)</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Unsynced Edits Sync Notification -->
        <div v-if="hasUnsyncedEdits" class="sync-reminder-bar">
          <span class="reminder-text">💡 You made changes in the preview sheet</span>
          <button @click="applyEditsToEditor" class="btn-sync-to-editor">
            Save to Document
          </button>
        </div>

        <!-- Modal Footer Actions Bar -->
        <footer class="modal-footer">
          <div class="export-formats">
            <button @click="downloadAsWord" class="btn-format btn-format-word" title="Download as formatted Word .doc">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Word (.doc)</span>
            </button>

            <button @click="downloadAsTxt" class="btn-format btn-format-txt" title="Download as plain text file">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>Text (.txt)</span>
            </button>
          </div>

          <div class="primary-actions">
            <button @click="closeModal" class="btn-cancel">
              Cancel
            </button>
            <button @click="printDocument" class="btn-primary-print" title="Print document or save as PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </footer>
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

const contentAreaRef = ref(null)
const previewTitle = ref('')
const previewFontSize = ref(16)
const previewMargin = ref('normal') // 'compact' | 'normal' | 'wide'
const previewOrientation = ref('portrait') // 'portrait' | 'landscape'
const previewIncludeBackground = ref(true)
const hasUnsyncedEdits = ref(false)

const currentDateStr = computed(() => {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

const sheetStyle = computed(() => ({
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

const increaseFontSize = () => {
  if (previewFontSize.value < 28) previewFontSize.value += 2
}

const decreaseFontSize = () => {
  if (previewFontSize.value > 12) previewFontSize.value -= 2
}

const onContentEdited = () => {
  hasUnsyncedEdits.value = true
}

const applyEditsToEditor = () => {
  const editedHtml = contentAreaRef.value ? contentAreaRef.value.innerHTML : ''
  emit('apply-changes', {
    title: previewTitle.value.trim() || 'Tamil Document',
    content: editedHtml
  })
  hasUnsyncedEdits.value = false
}

const closeModal = () => {
  emit('close')
}

// Populate sheet when modal opens
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    previewTitle.value = props.initialTitle || 'Tamil Document'
    previewFontSize.value = props.fontSize || 16
    previewMargin.value = 'normal'
    previewOrientation.value = 'portrait'
    previewIncludeBackground.value = Boolean(props.docBackground)
    hasUnsyncedEdits.value = false

    await nextTick()
    if (contentAreaRef.value) {
      contentAreaRef.value.innerHTML = props.initialContent || '<p>Start writing in Tanglish...</p>'
    }
  }
})

// ── Print Functionality ──────────────────────────────────────────
const printDocument = () => {
  const htmlToPrint = contentAreaRef.value ? contentAreaRef.value.innerHTML : (props.initialContent || '')
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
  const htmlToPrint = contentAreaRef.value ? contentAreaRef.value.innerHTML : (props.initialContent || '')
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
  const textContent = contentAreaRef.value ? contentAreaRef.value.innerText : ''
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

/* Compact Modal in Middle of Page */
.compact-print-modal {
  width: 92%;
  max-width: 660px;
  max-height: 88vh;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
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
.modal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.top-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-heading {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.25;
}

.modal-subheading {
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

/* Options Strip */
.options-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.option-pill-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.seg-control {
  display: inline-flex;
  background: #e2e8f0;
  padding: 2px;
  border-radius: 7px;
}

.seg-pill {
  border: none;
  background: transparent;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-pill.active {
  background: #ffffff;
  color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.stepper-control {
  display: inline-flex;
  align-items: center;
  background: #e2e8f0;
  padding: 2px;
  border-radius: 7px;
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
  background: #cbd5e1;
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

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
}

.checkbox-input {
  accent-color: #4f46e5;
  cursor: pointer;
}

/* Middle Viewport */
.sheet-viewport {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px 20px;
  background: #f1f5f9;
  overflow: hidden;
}

.edit-hint-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #475569;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 5px 12px;
  border-radius: 20px;
  width: fit-content;
  margin: 0 auto 10px auto;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.hint-icon {
  font-size: 12px;
}

.sheet-scroll-wrap {
  flex: 1;
  overflow-y: auto;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: center;
  max-height: 360px;
}

/* A4 Sheet Simulation */
.a4-preview-sheet {
  position: relative;
  width: 100%;
  max-width: 520px;
  min-height: 380px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  color: #0f172a;
  line-height: 1.7;
  overflow: hidden;
  transition: all 0.2s ease;
}

.a4-preview-sheet.margin-compact {
  padding: 18px;
}
.a4-preview-sheet.margin-normal {
  padding: 26px;
}
.a4-preview-sheet.margin-wide {
  padding: 34px;
}

.a4-preview-sheet.orientation-landscape {
  max-width: 600px;
  min-height: 290px;
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

.sheet-title-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.sheet-title-input {
  flex: 1;
  border: 1px dashed transparent;
  background: transparent;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  padding: 2px 4px;
  border-radius: 4px;
  outline: none;
  transition: all 0.15s ease;
}

.sheet-title-input:hover,
.sheet-title-input:focus {
  border-color: #6366f1;
  background: #f8fafc;
}

.sheet-date-tag {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.sheet-rule {
  position: relative;
  z-index: 1;
  height: 1px;
  background: #e2e8f0;
  margin-bottom: 14px;
}

.sheet-content-editable {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 160px;
  outline: none;
  padding: 4px;
  border-radius: 4px;
  border: 1px dashed transparent;
  transition: border-color 0.15s ease;
  word-break: break-word;
}

.sheet-content-editable:hover,
.sheet-content-editable:focus {
  border-color: #a5b4fc;
}

.sheet-content-editable :deep(h1) { font-size: 1.4em; margin: 0.6em 0 0.3em; color: #0f172a; }
.sheet-content-editable :deep(h2) { font-size: 1.25em; margin: 0.5em 0 0.25em; color: #0f172a; }
.sheet-content-editable :deep(h3) { font-size: 1.1em; margin: 0.4em 0 0.2em; color: #0f172a; }
.sheet-content-editable :deep(p) { margin: 0.4em 0; }
.sheet-content-editable :deep(blockquote) {
  border-left: 3px solid #6366f1;
  margin: 0.6em 0;
  padding-left: 10px;
  color: #475569;
  font-style: italic;
}
.sheet-content-editable :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

.sheet-footer-row {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
  font-size: 10px;
  color: #94a3b8;
  display: flex;
  justify-content: space-between;
}

/* Sync Notification */
.sync-reminder-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #ecfdf5;
  border-top: 1px solid #a7f3d0;
  border-bottom: 1px solid #a7f3d0;
}

.reminder-text {
  font-size: 12px;
  color: #065f46;
  font-weight: 500;
}

.btn-sync-to-editor {
  border: none;
  background: #10b981;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-sync-to-editor:hover {
  background: #059669;
}

/* Footer Actions */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #ffffff;
  border-top: 1px solid #f1f5f9;
  gap: 12px;
}

.export-formats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-format {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-format-word {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
}

.btn-format-word:hover {
  background: #dbeafe;
}

.btn-format-txt {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.btn-format-txt:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.primary-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-cancel {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-primary-print {
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
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

@media (max-width: 640px) {
  .options-strip {
    flex-direction: column;
    align-items: flex-start;
  }
  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .export-formats,
  .primary-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
