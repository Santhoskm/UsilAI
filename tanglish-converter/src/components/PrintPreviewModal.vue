<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="split-download-modal" role="dialog" aria-modal="true">
        <!-- Mobile Tabs Header (Switches between Settings & Sheet Preview on small screens) -->
        <div class="mobile-tabs-header">
          <button 
            type="button"
            class="mobile-tab-btn" 
            :class="{ active: mobileTab === 'settings' }" 
            @click="mobileTab = 'settings'"
          >
            ⚙️ Settings
          </button>
          <button 
            type="button"
            class="mobile-tab-btn" 
            :class="{ active: mobileTab === 'preview' }" 
            @click="mobileTab = 'preview'"
          >
            📄 A4 Preview
          </button>
          <button 
            type="button"
            class="mobile-close-btn" 
            @click="closeModal" 
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <!-- Split Body: Left = Format & Layout Controls | Right = A4 Preview -->
        <div class="modal-split-body">
          <!-- LEFT: Format & Layout Controls Only -->
          <div class="left-panel" :class="{ 'mobile-hidden': mobileTab !== 'settings' }">
            <!-- Section 1: File Formats -->
            <div class="panel-section">
              <div class="section-title-row">
                <span class="section-title">Download Format</span>
              </div>

              <div class="format-cards-grid">
                <!-- PDF Card -->
                <button 
                  @click="selectedFormat = 'pdf'" 
                  class="format-card"
                  :class="{ active: selectedFormat === 'pdf' }"
                >
                  <div class="format-badge pdf-badge">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <div class="format-meta">
                    <div class="format-name">PDF Document (.pdf)</div>
                    <div class="format-desc">Vector PDF with print styling</div>
                  </div>
                  <div class="format-check" v-if="selectedFormat === 'pdf'">✓</div>
                </button>

                <!-- Word Card -->
                <button 
                  @click="selectedFormat = 'word'" 
                  class="format-card"
                  :class="{ active: selectedFormat === 'word' }"
                >
                  <div class="format-badge word-badge">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div class="format-meta">
                    <div class="format-name">Word Document (.doc)</div>
                    <div class="format-desc">Microsoft Word formatted file</div>
                  </div>
                  <div class="format-check" v-if="selectedFormat === 'word'">✓</div>
                </button>

                <!-- Plain Text Card -->
                <button 
                  @click="selectedFormat = 'txt'" 
                  class="format-card"
                  :class="{ active: selectedFormat === 'txt' }"
                >
                  <div class="format-badge txt-badge">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                    </svg>
                  </div>
                  <div class="format-meta">
                    <div class="format-name">Plain Text (.txt)</div>
                    <div class="format-desc">Standard plain text file</div>
                  </div>
                  <div class="format-check" v-if="selectedFormat === 'txt'">✓</div>
                </button>
              </div>
            </div>

            <!-- Section 2: Page & Layout Formatting -->
            <div class="panel-section">
              <div class="section-title-row">
                <span class="section-title">Layout & Format Settings</span>
              </div>

              <!-- Download File Name Setting -->
              <div class="setting-row filename-setting-row">
                <span class="setting-label">File Name</span>
                <div class="filename-input-wrapper">
                  <input 
                    type="text" 
                    v-model="previewTitle" 
                    class="filename-input" 
                    placeholder="Enter file name"
                    spellcheck="false"
                  />
                  <span class="filename-ext">.{{ selectedFormat === 'word' ? 'doc' : (selectedFormat === 'txt' ? 'txt' : 'pdf') }}</span>
                </div>
              </div>

              <!-- Orientation Setting -->
              <div class="setting-row">
                <span class="setting-label">Orientation</span>
                <div class="segmented-control">
                  <button 
                    @click="previewOrientation = 'portrait'" 
                    class="seg-btn"
                    :class="{ active: previewOrientation === 'portrait' }"
                  >
                    <svg class="control-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="5" y="2" width="14" height="20" rx="2"></rect>
                    </svg>
                    <span>Portrait</span>
                  </button>
                  <button 
                    @click="previewOrientation = 'landscape'" 
                    class="seg-btn"
                    :class="{ active: previewOrientation === 'landscape' }"
                  >
                    <svg class="control-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                    </svg>
                    <span>Landscape</span>
                  </button>
                </div>
              </div>

              <!-- Margins Setting -->
              <div class="setting-row">
                <span class="setting-label">Margins</span>
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

              <!-- Font Size Setting -->
              <div class="setting-row">
                <span class="setting-label">Font Size</span>
                <div class="stepper-box">
                  <button @click="decreaseFontSize" class="stepper-btn" :disabled="previewFontSize <= 12" title="Decrease font size">−</button>
                  <span class="stepper-val">{{ previewFontSize }}px</span>
                  <button @click="increaseFontSize" class="stepper-btn" :disabled="previewFontSize >= 28" title="Increase font size">+</button>
                </div>
              </div>

              <!-- Font Family Format Selector -->
              <div class="setting-row">
                <span class="setting-label">Font Style</span>
                <select v-model="selectedFontFamily" class="font-select">
                  <option value="'Noto Sans Tamil', sans-serif">Noto Sans Tamil</option>
                  <option value="'Noto Serif Tamil', serif">Noto Serif Tamil</option>
                  <option value="'Catamaran', sans-serif">Catamaran</option>
                  <option value="'Mukta Malar', sans-serif">Mukta Malar</option>
                  <option value="'Baloo Thambi 2', sans-serif">Baloo Thambi</option>
                </select>
              </div>

              <!-- Document Background Watermark Toggle -->
              <div v-if="docBackground" class="setting-row">
                <span class="setting-label">Watermark</span>
                <label class="checkbox-toggle">
                  <input type="checkbox" v-model="previewIncludeBackground" />
                  <span>Include Background Texture</span>
                </label>
              </div>
            </div>

            <!-- Primary Download Trigger Button -->
            <div class="panel-actions">
              <button @click="triggerSelectedDownload" class="btn-primary-download" title="Download your document">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>{{ downloadButtonLabel }}</span>
              </button>
            </div>
          </div>

          <!-- RIGHT: A4 Document Sheet Preview (Read-only format preview) -->
          <div class="right-panel" :class="{ 'mobile-hidden': mobileTab !== 'preview' }">
            <!-- Stage Top Bar: Controls, Zoom & Close Button -->
            <div class="stage-topbar">
              <span class="preview-badge">A4 Sheet Preview</span>
              <div class="topbar-controls">
                <div class="zoom-stepper">
                  <button @click="zoomOut" class="btn-zoom" :disabled="zoomLevel <= 60" title="Zoom Out">−</button>
                  <span class="zoom-text">{{ zoomLevel }}%</span>
                  <button @click="zoomIn" class="btn-zoom" :disabled="zoomLevel >= 140" title="Zoom In">+</button>
                  <button @click="resetZoom" class="btn-zoom-reset" title="Reset Zoom">Reset</button>
                </div>
                <button @click="closeModal" class="btn-close-modal-topbar" aria-label="Close dialog" title="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Scrollable Stage Canvas -->
            <div class="stage-canvas">
              <div 
                class="a4-sheet"
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

                <!-- Sheet Content (Pure formatted preview) -->
                <div 
                  ref="rightSheetRef"
                  class="sheet-content-render"
                  :style="sheetTextStyle"
                ></div>
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

const rightSheetRef = ref(null)

const selectedFormat = ref('pdf') // 'pdf' | 'word' | 'txt'
const previewTitle = ref('')
const previewFontSize = ref(16)
const selectedFontFamily = ref("'Noto Sans Tamil', sans-serif")
const previewMargin = ref('normal') // 'compact' | 'normal' | 'wide'
const previewOrientation = ref('portrait') // 'portrait' | 'landscape'
const previewIncludeBackground = ref(true)
const zoomLevel = ref(90)
const mobileTab = ref('settings') // 'settings' | 'preview'

const currentDateStr = computed(() => {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

const downloadButtonLabel = computed(() => {
  if (selectedFormat.value === 'word') return 'Download as Word (.doc)'
  if (selectedFormat.value === 'txt') return 'Download as Plain Text (.txt)'
  return 'Download as PDF'
})

const sheetContainerStyle = computed(() => ({
  transform: `scale(${zoomLevel.value / 100})`,
  transformOrigin: 'top center'
}))

const sheetTextStyle = computed(() => ({
  fontFamily: selectedFontFamily.value || props.selectedFont?.value || "'Noto Sans Tamil', sans-serif",
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

const closeModal = () => {
  emit('close')
}

// When modal opens, initialize preview
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    selectedFormat.value = 'pdf'
    previewTitle.value = props.initialTitle || 'Tamil Document'
    previewFontSize.value = props.fontSize || 16
    selectedFontFamily.value = props.selectedFont?.value || "'Noto Sans Tamil', sans-serif"
    previewMargin.value = 'normal'
    previewOrientation.value = 'portrait'
    previewIncludeBackground.value = Boolean(props.docBackground)
    zoomLevel.value = 90
    mobileTab.value = 'settings'

    await nextTick()
    const content = props.initialContent || '<p>Start writing in Tanglish...</p>'
    if (rightSheetRef.value) {
      rightSheetRef.value.innerHTML = content
    }
  }
})

// Trigger download based on active format
const triggerSelectedDownload = () => {
  if (selectedFormat.value === 'word') {
    downloadAsWord()
  } else if (selectedFormat.value === 'txt') {
    downloadAsTxt()
  } else {
    downloadAsPDF()
  }
}

// Helper to get clean download filename
const getCleanFilename = () => {
  const raw = (previewTitle.value || '').trim() || (props.initialTitle || '').trim() || 'Tamil_Document'
  return raw.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Tamil_Document'
}

// ── Download as PDF ──────────────────────────────────────────────
const downloadAsPDF = () => {
  const htmlToPrint = rightSheetRef.value ? rightSheetRef.value.innerHTML : (props.initialContent || '')
  const cleanTitle = getCleanFilename()

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
        <title>${cleanTitle}</title>
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
            font-family: ${selectedFontFamily.value || "'Noto Sans Tamil', sans-serif"};
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
        </style>
      </head>
      <body>
        ${previewIncludeBackground.value && bgCss ? '<div class="print-bg-layer"></div>' : ''}
        <div class="print-content">${htmlToPrint}</div>
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

// ── Download as Word (.doc) ─────────────────────────────────────
const downloadAsWord = () => {
  const htmlToPrint = rightSheetRef.value ? rightSheetRef.value.innerHTML : (props.initialContent || '')
  const cleanTitle = getCleanFilename()

  const htmlDocument = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${cleanTitle}</title>
        <style>
          body {
            font-family: ${selectedFontFamily.value || "'Noto Sans Tamil', 'Arial Unicode MS', sans-serif"};
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
        <div>${htmlToPrint}</div>
      </body>
    </html>
  `
  const blob = new Blob(['\ufeff' + htmlDocument], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cleanTitle}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Download as Plain Text (.txt) ───────────────────────────────
const downloadAsTxt = () => {
  const textContent = rightSheetRef.value ? rightSheetRef.value.innerText : ''
  const cleanTitle = getCleanFilename()

  const fullText = textContent ? `${textContent}\n` : ''
  const blob = new Blob(['\ufeff' + fullText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cleanTitle}.txt`
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
.split-download-modal {
  width: 94%;
  max-width: 980px;
  height: 82vh;
  max-height: 650px;
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

/* Split Body */
.modal-split-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #ffffff;
  height: 100%;
}

/* ── LEFT: Formats & Layout Panel ───────────────────────── */
.left-panel {
  width: 44%;
  min-width: 340px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #ffffff;
  padding: 22px 22px 18px;
  gap: 16px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Format Cards Grid */
.format-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  position: relative;
}

.format-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.format-card.active {
  background: #eef2ff;
  border-color: #6366f1;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
}

.format-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.format-card:hover .format-badge {
  transform: scale(1.05);
}

.pdf-badge {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.word-badge {
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
}

.txt-badge {
  background: rgba(100, 116, 139, 0.14);
  color: #475569;
}

.format-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.format-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.format-desc {
  font-size: 11px;
  color: #64748b;
}

.format-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4f46e5;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

/* Settings Rows */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.setting-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.segmented-control {
  display: inline-flex;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px;
  border-radius: 9px;
}

.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn.active {
  background: #ffffff;
  color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.control-icon {
  flex-shrink: 0;
}

.stepper-box {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px;
  border-radius: 8px;
}

.stepper-btn {
  border: none;
  background: transparent;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  border-radius: 5px;
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
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.font-select {
  padding: 5px 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
  outline: none;
  cursor: pointer;
}

.checkbox-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
}

.checkbox-toggle input {
  accent-color: #4f46e5;
  width: 15px;
  height: 15px;
  cursor: pointer;
}

/* Panel Actions */
.panel-actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.btn-primary-download {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #ffffff;
  padding: 11px 18px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.28);
  transition: all 0.15s ease;
}

.btn-primary-download:hover {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.38);
  transform: translateY(-1px);
}

/* ── RIGHT: A4 Sheet Preview Panel ───────────────────────── */
.right-panel {
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
  padding: 10px 18px;
  background: #e2e8f0;
  border-bottom: 1px solid #cbd5e1;
}

.preview-badge {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.topbar-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-zoom {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  width: 25px;
  height: 25px;
  border-radius: 5px;
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
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
}

.btn-zoom-reset:hover {
  background: #f8fafc;
  color: #0f172a;
}

.btn-close-modal-topbar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close-modal-topbar:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
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
.a4-sheet {
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
  user-select: text;
}

.a4-sheet.margin-compact {
  padding: 20px;
}
.a4-sheet.margin-normal {
  padding: 28px;
}
.a4-sheet.margin-wide {
  padding: 36px;
}

.a4-sheet.orientation-landscape {
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

.filename-setting-row {
  align-items: center;
}

.filename-input-wrapper {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 3px 8px;
  transition: all 0.15s ease;
  max-width: 190px;
  width: 100%;
}

.filename-input-wrapper:focus-within {
  background: #ffffff;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.12);
}

.filename-input {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
  width: 100%;
  outline: none;
  padding: 2px 0;
}

.filename-ext {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  padding-left: 4px;
  user-select: none;
}

.sheet-content-render {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 240px;
  word-break: break-word;
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
  justify-content: flex-end;
}

.sheet-page-info {
  font-weight: 500;
}

/* Mobile Tabs Header (Hidden on Desktop) */
.mobile-tabs-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 12px;
  gap: 8px;
  flex-shrink: 0;
}

.mobile-tab-btn {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobile-tab-btn.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
}

.mobile-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* Responsive for smaller screens */
@media (max-width: 768px) {
  .mobile-tabs-header {
    display: flex;
  }
  .split-download-modal {
    width: 96%;
    height: 90vh;
    max-height: 92vh;
    border-radius: 16px;
  }
  .modal-split-body {
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .mobile-hidden {
    display: none !important;
  }
  .left-panel {
    width: 100%;
    min-width: 100%;
    border-right: none;
    border-bottom: none;
    padding: 16px 14px 24px 14px;
    flex: 1;
    overflow-y: auto;
  }
  .format-cards-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .right-panel {
    width: 100%;
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .stage-topbar {
    padding: 10px 14px;
  }
  .stage-canvas {
    padding: 12px 8px;
    flex: 1;
  }
  .a4-sheet {
    max-width: 100%;
    min-height: 440px;
    padding: 18px 14px;
  }
  .filename-input-wrapper {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 8px;
  }
  .split-download-modal {
    width: 100%;
    height: 94vh;
    max-height: 96vh;
    border-radius: 14px;
  }
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .segmented-control,
  .stepper-box,
  .font-select,
  .filename-input-wrapper {
    width: 100%;
  }
  .btn-primary-download {
    padding: 12px;
    font-size: 14px;
  }
}
</style>
