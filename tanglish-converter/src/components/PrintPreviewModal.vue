<template>
  <Teleport to="body">
    <div v-if="isOpen" class="print-preview-backdrop" @click.self="closeModal">
      <div class="print-preview-modal" role="dialog" aria-modal="true">
        <!-- Modal Top Bar -->
        <header class="preview-modal-header">
          <div class="header-left">
            <div class="header-icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </div>
            <div>
              <h2 class="preview-modal-title">Print & Download Preview</h2>
              <p class="preview-modal-subtitle">Interactive A4 printable sheet • Click anywhere on the sheet to edit text before printing</p>
            </div>
          </div>

          <div class="header-actions">
            <!-- Quick Print Primary Button -->
            <button @click="printDocument" class="btn-primary-print" title="Print document or save as PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>Print / Save as PDF</span>
            </button>

            <!-- Close Button -->
            <button @click="closeModal" class="btn-close-preview" aria-label="Close preview">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <!-- Modal Body: Main Stage & Controls Sidebar -->
        <div class="preview-modal-body">
          <!-- Left: Scrollable Paper Stage -->
          <main class="preview-paper-stage">
            <!-- Stage Zoom & Utility Bar -->
            <div class="stage-toolbar">
              <div class="zoom-controls">
                <button @click="zoomOut" class="btn-stage-tool" title="Zoom Out" :disabled="zoomLevel <= 50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <span class="zoom-badge">{{ zoomLevel }}%</span>
                <button @click="zoomIn" class="btn-stage-tool" title="Zoom In" :disabled="zoomLevel >= 150">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button @click="resetZoom" class="btn-stage-tool-text">Reset</button>
              </div>

              <div class="edit-hint-badge">
                <span class="hint-dot"></span>
                <span>Editable Preview: Click text or title to make last-minute edits</span>
              </div>
            </div>

            <!-- Scroll Container -->
            <div class="sheet-scroll-container">
              <!-- Printable Sheet (A4 Dimensions scaled by zoom) -->
              <div 
                class="printable-a4-sheet"
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

                <!-- Printable Sheet Header (Title) -->
                <div v-if="previewIncludeHeaderFooter" class="sheet-header">
                  <div class="title-edit-wrapper">
                    <input 
                      type="text"
                      v-model="previewTitle"
                      class="sheet-title-input"
                      placeholder="Click to edit document title..."
                      title="Editable Document Title"
                    />
                    <span class="edit-icon-indicator" title="Edit title">✏️</span>
                  </div>
                  <div class="sheet-header-line"></div>
                </div>

                <!-- Printable Sheet Content (Editable contenteditable) -->
                <div 
                  ref="contentAreaRef"
                  contenteditable="true"
                  class="sheet-content-editable"
                  @input="onContentEdited"
                  spellcheck="false"
                  title="Click anywhere to edit content before printing"
                ></div>

                <!-- Printable Sheet Footer -->
                <div v-if="previewIncludeHeaderFooter" class="sheet-footer">
                  <span class="footer-brand">Created with Usil AI (Tanglish to Tamil)</span>
                  <span class="footer-date">{{ currentDateStr }}</span>
                  <span class="footer-page">Page 1 of 1</span>
                </div>
              </div>
            </div>
          </main>

          <!-- Right: Print & Export Control Sidebar -->
          <aside class="preview-settings-sidebar">
            <!-- Section: Primary Actions -->
            <div class="settings-card primary-actions-card">
              <h3 class="settings-card-title">Export Actions</h3>
              
              <button @click="printDocument" class="action-btn-main print-action">
                <div class="action-icon print-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                </div>
                <div class="action-details">
                  <span class="action-name">Print / Save as PDF</span>
                  <span class="action-desc">High quality print or vector PDF</span>
                </div>
              </button>

              <button @click="downloadAsWord" class="action-btn-main word-action">
                <div class="action-icon doc-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div class="action-details">
                  <span class="action-name">Word Document (.doc)</span>
                  <span class="action-desc">Formatted Microsoft Word</span>
                </div>
              </button>

              <button @click="downloadAsTxt" class="action-btn-main txt-action">
                <div class="action-icon txt-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div class="action-details">
                  <span class="action-name">Plain Text (.txt)</span>
                  <span class="action-desc">Standard unformatted text</span>
                </div>
              </button>

              <div v-if="hasUnsyncedEdits" class="sync-edits-banner">
                <div class="sync-banner-text">You edited this preview</div>
                <button @click="applyEditsToEditor" class="btn-apply-sync">
                  <span>🔄 Save Changes to Document</span>
                </button>
              </div>
            </div>

            <!-- Section: Layout & Page Settings -->
            <div class="settings-card">
              <h3 class="settings-card-title">Page Layout</h3>

              <!-- Orientation Toggle -->
              <div class="control-row">
                <label class="control-label">Orientation</label>
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
              <div class="control-row">
                <label class="control-label">Margins</label>
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

              <!-- Font Size -->
              <div class="control-row">
                <div class="label-with-val">
                  <label class="control-label">Font Size</label>
                  <span class="value-chip">{{ previewFontSize }}px</span>
                </div>
                <div class="slider-wrapper">
                  <input 
                    type="range" 
                    min="12" 
                    max="24" 
                    step="1" 
                    v-model.number="previewFontSize" 
                    class="preview-slider"
                  />
                </div>
              </div>
            </div>

            <!-- Section: Elements Toggle -->
            <div class="settings-card">
              <h3 class="settings-card-title">Display Elements</h3>

              <!-- Background Watermark Toggle -->
              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-title">Document Background</span>
                  <span class="toggle-subtitle">Print watermark or texture</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="previewIncludeBackground" :disabled="!docBackground" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Header & Footer Toggle -->
              <div class="toggle-row">
                <div class="toggle-info">
                  <span class="toggle-title">Header & Footer</span>
                  <span class="toggle-subtitle">Include title, date & page info</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="previewIncludeHeaderFooter" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </aside>
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

const contentAreaRef = ref(null)
const previewTitle = ref('')
const previewFontSize = ref(16)
const previewMargin = ref('normal') // 'compact' | 'normal' | 'wide'
const previewOrientation = ref('portrait') // 'portrait' | 'landscape'
const previewPaperSize = ref('A4')
const previewIncludeBackground = ref(true)
const previewIncludeHeaderFooter = ref(true)
const zoomLevel = ref(100)
const hasUnsyncedEdits = ref(false)

const currentDateStr = computed(() => {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

const sheetStyle = computed(() => ({
  transform: `scale(${zoomLevel.value / 100})`,
  transformOrigin: 'top center',
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

const zoomIn = () => {
  if (zoomLevel.value < 150) zoomLevel.value += 10
}
const zoomOut = () => {
  if (zoomLevel.value > 50) zoomLevel.value -= 10
}
const resetZoom = () => {
  zoomLevel.value = 100
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
    previewIncludeHeaderFooter.value = true
    zoomLevel.value = 100
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
  const chosenSize = `${previewPaperSize.value || 'A4'} ${chosenOrientation}`

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
            size: ${chosenSize};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: ${props.selectedFont?.value || "'Noto Sans Tamil', sans-serif"};
            font-size: ${previewFontSize.value || 16}px;
            line-height: 1.8;
            color: #0f172a;
            margin: 0;
            padding: 0;
            position: relative;
            background: white;
          }
          ${previewIncludeBackground.value && bgCss ? `
            .print-bg-layer {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              z-index: -1;
              pointer-events: none;
              ${bgCss}
            }
          ` : ''}
          .print-header {
            border-bottom: 2px solid #6366f1;
            padding-bottom: 10px;
            margin-bottom: 24px;
          }
          .print-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
          }
          .print-content {
            min-height: 200px;
          }
          .print-content h1 { font-size: 24px; margin-top: 1.2em; margin-bottom: 0.5em; color: #1e293b; }
          .print-content h2 { font-size: 20px; margin-top: 1.1em; margin-bottom: 0.4em; color: #1e293b; }
          .print-content h3 { font-size: 18px; margin-top: 1em; margin-bottom: 0.3em; color: #1e293b; }
          .print-content p { margin: 0.8em 0; }
          .print-content blockquote { border-left: 3px solid #6366f1; margin: 1em 0; padding-left: 14px; color: #475569; font-style: italic; }
          .print-content code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
          .print-content img.editor-embedded-image {
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
        ${previewIncludeHeaderFooter.value ? `
          <div class="print-header">
            <h1 class="print-title">${titleToPrint}</h1>
          </div>
        ` : ''}
        <div class="print-content">${htmlToPrint}</div>
        ${previewIncludeHeaderFooter.value ? `
          <div class="print-footer">
            <span>Created with Usil AI (Tanglish to Tamil)</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        ` : ''}
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

// ── Export as Word (.doc) from preview ──────────────────────────
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
          h1 { font-size: 20pt; color: #1e293b; margin-bottom: 8pt; }
          h2 { font-size: 16pt; color: #1e293b; margin-bottom: 6pt; }
          h3 { font-size: 14pt; color: #1e293b; margin-bottom: 4pt; }
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

// ── Export as Plain Text (.txt) from preview ────────────────────
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
.print-preview-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
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

.print-preview-modal {
  width: 96vw;
  max-width: 1440px;
  height: 94vh;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

/* Header */
.preview-modal-header {
  height: 64px;
  min-height: 64px;
  background: #1e293b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
}

.preview-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.01em;
}

.preview-modal-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-primary-print {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}

.btn-primary-print:hover {
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
}

.btn-close-preview {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close-preview:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

/* Modal Body */
.preview-modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #0b1120;
}

/* Main Paper Stage (Left) */
.preview-paper-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #090e1a;
  position: relative;
}

.stage-toolbar {
  height: 44px;
  min-height: 44px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 10;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-stage-tool {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-stage-tool:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.btn-stage-tool:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.zoom-badge {
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  min-width: 44px;
  text-align: center;
}

.btn-stage-tool-text {
  background: transparent;
  border: none;
  color: #818cf8;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-stage-tool-text:hover {
  background: rgba(129, 140, 248, 0.15);
}

.edit-hint-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: #cbd5e1;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 3px 12px;
  border-radius: 20px;
}

.hint-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.sheet-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 36px 24px 60px;
  display: flex;
  justify-content: center;
}

/* Printable A4 Sheet Simulation */
.printable-a4-sheet {
  width: 210mm;
  min-height: 297mm;
  background: #ffffff;
  color: #0f172a;
  border-radius: 4px;
  box-shadow: 0 16px 48px -8px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.25);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s ease, width 0.2s ease, min-height 0.2s ease;
  line-height: 1.8;
}

/* Margins */
.printable-a4-sheet.margin-compact {
  padding: 12mm 14mm 16mm;
}
.printable-a4-sheet.margin-normal {
  padding: 20mm 22mm 24mm;
}
.printable-a4-sheet.margin-wide {
  padding: 28mm 30mm 32mm;
}

/* Orientation */
.printable-a4-sheet.orientation-landscape {
  width: 297mm;
  min-height: 210mm;
}

/* Background Layer */
.sheet-bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 4px;
  pointer-events: none;
  z-index: 1;
}

/* Header */
.sheet-header {
  position: relative;
  z-index: 2;
  margin-bottom: 20px;
}

.title-edit-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.sheet-title-input {
  width: 100%;
  border: 1px dashed transparent;
  background: transparent;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  padding: 4px 32px 4px 4px;
  border-radius: 4px;
  outline: none;
  transition: all 0.15s ease;
}

.sheet-title-input:hover {
  border-color: #cbd5e1;
  background: rgba(241, 245, 249, 0.5);
}

.sheet-title-input:focus {
  border-color: #6366f1;
  background: #f8fafc;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.edit-icon-indicator {
  position: absolute;
  right: 8px;
  font-size: 14px;
  opacity: 0.4;
  pointer-events: none;
}

.sheet-header-line {
  height: 2px;
  background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
  margin-top: 8px;
  border-radius: 2px;
}

/* Content Area */
.sheet-content-editable {
  flex: 1;
  position: relative;
  z-index: 2;
  outline: none;
  min-height: 200px;
  padding: 4px;
  border: 1px dashed transparent;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.sheet-content-editable:hover {
  border-color: #cbd5e1;
}

.sheet-content-editable:focus {
  border-color: #6366f1;
  background: rgba(248, 250, 252, 0.6);
}

.sheet-content-editable h1 { font-size: 24px; margin: 1em 0 0.4em; color: #1e293b; }
.sheet-content-editable h2 { font-size: 20px; margin: 1em 0 0.4em; color: #1e293b; }
.sheet-content-editable h3 { font-size: 18px; margin: 0.8em 0 0.3em; color: #1e293b; }
.sheet-content-editable p { margin: 0.7em 0; }
.sheet-content-editable blockquote { border-left: 3px solid #6366f1; margin: 1em 0; padding-left: 14px; color: #475569; font-style: italic; }
.sheet-content-editable code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
.sheet-content-editable img.editor-embedded-image {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 10px 0;
}

/* Footer */
.sheet-footer {
  position: relative;
  z-index: 2;
  margin-top: 36px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Control Sidebar (Right) */
.preview-settings-sidebar {
  width: 340px;
  min-width: 340px;
  background: #111827;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
}

.settings-card-title {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

/* Action Buttons */
.action-btn-main {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.action-btn-main:last-child {
  margin-bottom: 0;
}

.action-btn-main:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.print-icon { background: rgba(99, 102, 241, 0.18); color: #818cf8; }
.doc-icon { background: rgba(37, 99, 235, 0.18); color: #60a5fa; }
.txt-icon { background: rgba(16, 185, 129, 0.18); color: #34d399; }

.action-details {
  display: flex;
  flex-direction: column;
}

.action-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #f1f5f9;
}

.action-desc {
  font-size: 11.5px;
  color: #94a3b8;
}

/* Sync banner */
.sync-edits-banner {
  margin-top: 14px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  text-align: center;
}

.sync-banner-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #c7d2fe;
  margin-bottom: 8px;
}

.btn-apply-sync {
  width: 100%;
  padding: 8px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-apply-sync:hover {
  background: #4f46e5;
}

/* Form Controls */
.control-row {
  margin-bottom: 14px;
}
.control-row:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.label-with-val {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.value-chip {
  font-size: 11px;
  font-weight: 700;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.segmented-control {
  display: flex;
  background: rgba(15, 23, 42, 0.6);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.seg-btn {
  flex: 1;
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.seg-btn.active {
  background: #4f46e5;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.preview-slider {
  width: 100%;
  accent-color: #6366f1;
  height: 4px;
}

/* Toggle Switches */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.toggle-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.toggle-info {
  display: flex;
  flex-direction: column;
}

.toggle-title {
  font-size: 12.5px;
  font-weight: 600;
  color: #e2e8f0;
}

.toggle-subtitle {
  font-size: 11px;
  color: #64748b;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 22px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #334155;
  transition: .2s;
  border-radius: 22px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #4f46e5;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .preview-modal-body {
    flex-direction: column;
  }
  .preview-settings-sidebar {
    width: 100%;
    min-width: 100%;
    height: 240px;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
