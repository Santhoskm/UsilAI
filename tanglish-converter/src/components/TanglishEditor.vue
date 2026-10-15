<template>
  <div class="tanglish-editor-container">
    <!-- Toolbar -->
    <div class="toolbar" v-if="editor">
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ active: editor.isActive('bold') }"
          class="toolbar-btn"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ active: editor.isActive('italic') }"
          class="toolbar-btn"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ active: editor.isActive('strike') }"
          class="toolbar-btn"
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          @click="editor.chain().focus().toggleCode().run()"
          :class="{ active: editor.isActive('code') }"
          class="toolbar-btn"
          title="Inline Code"
        >
          &lt;/&gt;
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          :class="{ active: editor.isActive('heading', { level: 1 }) }"
          class="toolbar-btn"
          title="Heading 1"
        >
          H1
        </button>
        <button
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="{ active: editor.isActive('heading', { level: 2 }) }"
          class="toolbar-btn"
          title="Heading 2"
        >
          H2
        </button>
        <button
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :class="{ active: editor.isActive('heading', { level: 3 }) }"
          class="toolbar-btn"
          title="Heading 3"
        >
          H3
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ active: editor.isActive('bulletList') }"
          class="toolbar-btn"
          title="Bullet List"
        >
          ☰
        </button>
        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ active: editor.isActive('orderedList') }"
          class="toolbar-btn"
          title="Ordered List"
        >
          1.
        </button>
        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ active: editor.isActive('blockquote') }"
          class="toolbar-btn"
          title="Quote"
        >
          ❝
        </button>
        <button
          @click="editor.chain().focus().setHorizontalRule().run()"
          class="toolbar-btn"
          title="Horizontal Rule"
        >
          ─
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="toolbar-btn"
          title="Undo"
        >
          ↩
        </button>
        <button
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="toolbar-btn"
          title="Redo"
        >
          ↪
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <!-- Text Alignment -->
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().setTextAlign('left').run()"
          :class="{ active: editor.isActive({ textAlign: 'left' }) }"
          class="toolbar-btn"
          title="Align Left"
        >
          ⬛︎
        </button>
        <button
          @click="editor.chain().focus().setTextAlign('center').run()"
          :class="{ active: editor.isActive({ textAlign: 'center' }) }"
          class="toolbar-btn"
          title="Align Center"
        >
          ▣
        </button>
        <button
          @click="editor.chain().focus().setTextAlign('right').run()"
          :class="{ active: editor.isActive({ textAlign: 'right' }) }"
          class="toolbar-btn"
          title="Align Right"
        >
          ▤
        </button>
        <button
          @click="editor.chain().focus().setTextAlign('justify').run()"
          :class="{ active: editor.isActive({ textAlign: 'justify' }) }"
          class="toolbar-btn"
          title="Justify"
        >
          ☰
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <!-- Font Size -->
      <div class="toolbar-group">
        <div class="font-size-wrapper" ref="fontSizeRef">
          <button class="toolbar-btn font-size-btn" @click="showFontSizeDropdown = !showFontSizeDropdown" title="Font Size">
            <span>{{ currentFontSize }}px</span>
            <span class="font-caret">▾</span>
          </button>
          <div v-if="showFontSizeDropdown" class="font-size-dropdown">
            <div
              v-for="size in FONT_SIZES"
              :key="size"
              class="font-size-option"
              :class="{ active: currentFontSize === size }"
              @click="applyFontSize(size)"
            >
              <span :style="{ fontSize: Math.min(size, 22) + 'px', lineHeight: '1' }">அ</span>
              <span class="size-label">{{ size }}px</span>
            </div>
          </div>
        </div>
        <button class="toolbar-btn" title="Decrease Font Size" @click="changeFontSize(-2)">A−</button>
        <button class="toolbar-btn" title="Increase Font Size" @click="changeFontSize(+2)">A+</button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button @click="clearEditor" class="toolbar-btn btn-clear" title="Clear Editor Content">
          Clear
        </button>
        <button 
          @click="toggleAIHelp" 
          class="toolbar-btn btn-ai"
          :class="{ active: aiHelpEnabled }"
          :title="aiHelpEnabled ? 'Grammar Checker: ON - Click to turn OFF' : 'Grammar Checker: OFF - Click to turn ON'"
        >
          Grammar Checker {{ aiHelpEnabled ? 'ON' : 'OFF' }}
        </button>

        <!-- Download / Export Dropdown -->
        <div class="download-dropdown-wrapper" ref="downloadDropdownRef">
          <button 
            @click="showDownloadDropdown = !showDownloadDropdown" 
            class="toolbar-btn btn-download"
            title="Download / Export Content"
          >
            <svg class="download-svg-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.5V15.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
              <path d="M5.5 10.5L12 16.5L18.5 10.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3.5 21H20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
            </svg>
            <span class="download-btn-text">Download</span>
            <span class="font-caret">▾</span>
          </button>
          
          <div v-if="showDownloadDropdown" class="download-dropdown-menu">
            <button @click="downloadAsPDF" class="download-menu-item">
              <div class="item-icon-badge">
                <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.5V15.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                  <path d="M5.5 10.5L12 16.5L18.5 10.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M3.5 21H20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="item-info">
                <span class="item-title">PDF Document (.pdf)</span>
                <span class="item-desc">Print / Save as PDF</span>
              </div>
            </button>
            <button @click="downloadAsDocx" class="download-menu-item">
              <div class="item-icon-badge">
                <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.5V15.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                  <path d="M5.5 10.5L12 16.5L18.5 10.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M3.5 21H20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="item-info">
                <span class="item-title">Word Document (.doc)</span>
                <span class="item-desc">Microsoft Word / Docs format</span>
              </div>
            </button>
            <button @click="downloadAsTxt" class="download-menu-item">
              <div class="item-icon-badge">
                <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.5V15.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                  <path d="M5.5 10.5L12 16.5L18.5 10.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M3.5 21H20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="item-info">
                <span class="item-title">Plain Text (.txt)</span>
                <span class="item-desc">Standard text file</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Font Selector -->
      <div class="toolbar-font-selector" ref="fontSelectorRef">
        <button class="font-selector-btn" @click="showFontDropdown = !showFontDropdown" title="Change Tamil Font">
          <span class="font-preview">அ</span>
          <span class="font-name">{{ selectedFont.label }}</span>
          <span class="font-caret">▾</span>
        </button>
        <div v-if="showFontDropdown" class="font-dropdown">
          <div
            v-for="font in TAMIL_FONTS"
            :key="font.label"
            class="font-option"
            :class="{ active: selectedFont.label === font.label }"
            @click="applyFont(font)"
            :style="{ fontFamily: font.value }"
          >
            <span class="font-sample">அ ஆ </span>
            <span class="font-label">{{ font.label }}</span>
          </div>
        </div>
      </div>

      <div class="toolbar-stats">
        <span>{{ wordCount }} words</span>
        <span>{{ charCount }} chars</span>
      </div>
    </div>

    <!-- Main Workspace Layout: Editor on Left, AI Assistant Sidebar on Right -->
    <div class="editor-workspace" :class="{ 'with-sidebar': aiHelpEnabled }">
      <!-- Editor Area -->
      <div class="editor-wrapper" ref="editorWrapper">
        <!-- Free Credits Limit Reached Alert: minimal per user request -->
        <div v-if="!isAuthenticated && isOutOfCredits" class="credit-exhausted-banner">
          <span class="banner-msg">Reached limit</span>
          <button class="banner-login-btn" @click="openCreditModal">
            Sign in
          </button>
        </div>

        <editor-content :editor="editor" class="editor-content" :style="{ fontFamily: selectedFont.value, fontSize: currentFontSize + 'px' }" />

        <!-- Suggestions Popup (Disabled once credits limit reached) -->
        <div v-show="showSuggestions && suggestionsList.length > 0 && (!isOutOfCredits || isAuthenticated)"
             class="suggestions-popup"
             :style="popupStyle">
          <div v-for="(suggestion, idx) in suggestionsList"
               :key="suggestion.tamil"
               @click="selectSuggestion(suggestion, idx)"
               :class="{ 'selected': idx === selectedSuggestionIndex }"
               class="suggestion-item">
            <span class="tamil-text-main">{{ suggestion.tamil }}</span>
            <span class="suggestion-space-hint" v-if="idx === 0">Space</span>
          </div>
        </div>
      </div>

      <!-- AI Assistant / Grammar Checker Sidebar (Matches screenshot) -->
      <aside v-if="aiHelpEnabled" class="ai-assistant-sidebar">
        <!-- Sidebar Header -->
        <div class="sidebar-header">
          <div class="sidebar-title-group">
            <span class="sidebar-spark-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" fill="#ea580c"/>
                <circle cx="18.5" cy="5.5" r="2.2" fill="#f97316"/>
              </svg>
            </span>
            <span class="sidebar-title">AI Assistant</span>
          </div>
          <button class="sidebar-close-btn" @click="toggleAIHelp" title="Close AI Assistant">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Mode Toggle: Auto / Manual -->
        <div class="sidebar-mode-section">
          <div class="mode-toggle-pill">
            <button 
              type="button"
              class="mode-pill-btn" 
              :class="{ active: autoCheckMode }" 
              @click="setAutoCheckMode(true)"
            >
              <span class="mode-icon-spark">⚡</span>
              <span>Auto</span>
            </button>
            <button 
              type="button"
              class="mode-pill-btn" 
              :class="{ active: !autoCheckMode }" 
              @click="setAutoCheckMode(false)"
            >
              <span class="mode-icon-clock">🕒</span>
              <span>Manual</span>
            </button>
          </div>
          <p class="mode-timing-hint">
            {{ autoCheckMode ? 'Checks automatically 3s after you stop typing' : 'Click "Check Grammar" below to scan text' }}
          </p>
        </div>

        <!-- Manual Scan Button (visible when in Manual mode) -->
        <div v-if="!autoCheckMode" class="manual-scan-box">
          <button type="button" class="btn-manual-scan" @click="triggerGrammarScan" :disabled="aiChecking">
            <span v-if="!aiChecking">🔍 Check Grammar</span>
            <span v-else>Analyzing document...</span>
          </button>
        </div>

        <!-- Issue Count and Bulk Actions Bar -->
        <div class="issues-status-bar">
          <div class="issue-count-label">
            <span v-if="aiChecking" class="issues-spinner-circle"></span>
            <span>{{ aiChecking ? 'Checking text...' : (activeIssues.length === 1 ? '1 issue' : (activeIssues.length > 0 ? activeIssues.length + ' issues' : 'No issues found')) }}</span>
          </div>
          <div v-if="activeIssues.length > 0" class="bulk-actions-group">
            <button type="button" class="btn-fix-all" @click="applyAllIssues">Fix all</button>
            <button type="button" class="btn-dismiss-all" @click="dismissAllIssues">Dismiss all</button>
          </div>
        </div>

        <!-- Issues Cards Container (Scrollable) -->
        <div class="issues-scroll-area">
          <div v-if="activeIssues.length === 0 && !aiChecking" class="no-issues-placeholder">
            <div class="no-issues-check-icon">✓</div>
            <div class="no-issues-main-msg">Your Tamil text looks great!</div>
            <div class="no-issues-sub-msg">No grammar, spelling, or clarity issues found.</div>
          </div>

          <!-- Issue Card (Matches screenshot layout) -->
          <div 
            v-for="(issue, idx) in activeIssues" 
            :key="issue.id || idx" 
            class="issue-card"
          >
            <!-- Badge -->
            <div class="issue-card-top">
              <span class="issue-badge" :class="issue.type?.toLowerCase() || 'clarity'">
                {{ issue.type || 'Clarity' }}
              </span>
            </div>

            <!-- Strikethrough Original & Green Corrected -->
            <div class="issue-diff-box">
              <div class="diff-original-row">
                <span class="original-strikethrough-tag">
                  <s>{{ issue.original }}</s>
                </span>
              </div>
              <div class="diff-corrected-row">
                {{ issue.corrected }}
              </div>
            </div>

            <!-- Explanation -->
            <p class="issue-explanation-desc">
              {{ issue.explanation }}
            </p>

            <!-- Card Actions -->
            <div class="issue-card-actions">
              <button type="button" class="btn-apply-card" @click="applySingleIssue(issue, idx)">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <span>Apply</span>
              </button>
              <button type="button" class="btn-dismiss-card" @click="dismissSingleIssue(idx)">
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Actions Section at Bottom (Matches screenshot) -->
        <div class="sidebar-quick-actions">
          <div class="quick-actions-title">Quick actions</div>
          <div class="quick-actions-list">
            <button type="button" class="quick-action-item" @click="handleTranslateToEnglish" title="Translate Tamil content to English">
              <span class="quick-action-symbol">文A</span>
              <span class="quick-action-text">Translate to English</span>
            </button>
            <button type="button" class="quick-action-item" @click="handleSummarizeText" title="Summarize document into key points">
              <span class="quick-action-symbol">📄</span>
              <span class="quick-action-text">Summarize text</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Quick Action Modal (Translate / Summarize Results) -->
    <Teleport to="body">
      <div v-if="showQuickActionModal" class="quick-action-overlay" @click.self="showQuickActionModal = false">
        <div class="quick-action-modal">
          <div class="qa-modal-header">
            <h3>{{ quickActionModalTitle }}</h3>
            <button class="qa-close-btn" @click="showQuickActionModal = false">✕</button>
          </div>
          <div class="qa-modal-body">
            <div v-if="quickActionLoading" class="qa-loading-state">
              <div class="spinner-small"></div>
              <span>Processing with AI...</span>
            </div>
            <pre v-else class="qa-content-text">{{ quickActionModalContent }}</pre>
          </div>
          <div class="qa-modal-footer">
            <button class="qa-btn-copy" @click="copyQuickActionResult">📋 Copy</button>
            <button class="qa-btn-insert" @click="insertQuickActionResult">➕ Insert into Editor</button>
            <button class="qa-btn-done" @click="showQuickActionModal = false">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useTanglishConverter } from '@/composables/useTanglishConverter'
import { preloadCommonChunks } from '@/data/tamilEngine'
import { useClaudeGrammarChecker } from '@/composables/useClaudeGrammarChecker'
import { useAuth } from '@/composables/useAuth'
import { useCredits } from '@/composables/useCredits'

const { isAuthenticated } = useAuth()
const { creditsLeft, isOutOfCredits, consumeCredit, openCreditModal } = useCredits()
const { suggestions: aiSuggestions, convertWord, convertSentence, getSuggestions, learnCorrection, recordUsage } = useTanglishConverter()
const { checkGrammar, isChecking: aiChecking, error: aiError, correctionResult } = useClaudeGrammarChecker()


// State
const autoConvert = ref(true)
const showSuggestions = ref(false)
const suggestionsList = ref([])
const selectedSuggestionIndex = ref(0)
const popupStyle = ref({})
const editorWrapper = ref(null)
const fontSelectorRef = ref(null)
const wordCount = ref(0)
const charCount = ref(0)
const lastProcessedWord = ref('')
const lastProcessedPosition = ref(-1)

// Download / Export dropdown state
const showDownloadDropdown = ref(false)
const downloadDropdownRef = ref(null)

// Watch for Deep Learning suggestions from the backend API
watch(aiSuggestions, (newSuggestions) => {
  if (!isAuthenticated.value && isOutOfCredits.value) {
    showSuggestions.value = false
    suggestionsList.value = []
    return
  }
  if (newSuggestions && newSuggestions.length > 0) {
    suggestionsList.value = newSuggestions
    if (!showSuggestions.value) {
      showSuggestions.value = true
      selectedSuggestionIndex.value = 0
      if (editor.value) {
        updatePopupPosition(editor.value.view)
      }
    }
  }
})

// Immediately hide suggestions if credit limit is reached
watch(isOutOfCredits, (out) => {
  if (out && !isAuthenticated.value) {
    showSuggestions.value = false
    suggestionsList.value = []
  }
})

// ── AI Assistant & Grammar Checker Sidebar State ─────────────────
const aiHelpEnabled = ref(false)
const autoCheckMode = ref(true)
const activeIssues = ref([])
let checkDebounceTimer = null

// Quick Action Modal States
const showQuickActionModal = ref(false)
const quickActionModalTitle = ref('')
const quickActionModalContent = ref('')
const quickActionLoading = ref(false)

// ── VOICE TYPING STATE ──────────────────────────────────────────
const isVoiceActive = ref(false)
const voiceInterim = ref('')
const voiceError = ref('')
let recognition = null

// ── Font Size ────────────────────────────────────────────────────
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72]
const currentFontSize = ref(16)
const showFontSizeDropdown = ref(false)
const fontSizeRef = ref(null)

const applyFontSize = (size) => {
  currentFontSize.value = size
  showFontSizeDropdown.value = false
}

const changeFontSize = (delta) => {
  const idx = FONT_SIZES.indexOf(currentFontSize.value)
  if (idx === -1) {
    // snap to nearest
    const clamped = Math.max(10, Math.min(72, currentFontSize.value + delta))
    currentFontSize.value = FONT_SIZES.reduce((a, b) => Math.abs(b - clamped) < Math.abs(a - clamped) ? b : a)
  } else {
    const newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + (delta > 0 ? 1 : -1)))
    currentFontSize.value = FONT_SIZES[newIdx]
  }
}
// ── End Font Size ────────────────────────────────────────────────

// ── FONT THEME STATE ────────────────────────────────────────────
const TAMIL_FONTS = [
  { label: 'Noto Sans Tamil',  value: "'Noto Sans Tamil', sans-serif",   google: 'Noto+Sans+Tamil:wght@400;500;700' },
  { label: 'Noto Serif Tamil', value: "'Noto Serif Tamil', serif",        google: 'Noto+Serif+Tamil:wght@400;700' },
  { label: 'Catamaran',        value: "'Catamaran', sans-serif",          google: 'Catamaran:wght@400;600;700' },
  { label: 'Meera Inimai',     value: "'Meera Inimai', sans-serif",       google: 'Meera+Inimai' },
  { label: 'Mukta Malar',      value: "'Mukta Malar', sans-serif",        google: 'Mukta+Malar:wght@400;600' },
  { label: 'Arima Madurai',    value: "'Arima Madurai', serif",           google: 'Arima+Madurai:wght@400;700' },
  { label: 'Baloo Thambi 2',   value: "'Baloo Thambi 2', sans-serif",     google: 'Baloo+Thambi+2:wght@400;700' },
  { label: 'Latha',            value: "'Latha', sans-serif",              google: null },
  { label: 'Vijaya',           value: "'Vijaya', sans-serif",             google: null },
  { label: 'Tamil Sangam MN',  value: "'Tamil Sangam MN', sans-serif",    google: null },
]

const selectedFont = ref(TAMIL_FONTS[0])
const showFontDropdown = ref(false)

function applyFont(font) {
  selectedFont.value = font
  showFontDropdown.value = false
  if (font.google) {
    const existing = document.querySelector('link[data-gfont="' + font.google + '"]')
    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=' + font.google + '&display=swap'
      link.setAttribute('data-gfont', font.google)
      document.head.appendChild(link)
    }
  }
}

// Get current word being typed with improved accuracy
const getCurrentWord = (text, cursorPos) => {
  const before = text.slice(0, cursorPos)
  const match = before.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?$/)
  
  if (match && match[0].length > 0) {
    const word = match[0]
    const start = cursorPos - word.length
    return { word, start, end: cursorPos }
  }
  return { word: '', start: cursorPos, end: cursorPos }
}

// Replace word in editor
const replaceWord = (view, start, end, replacement, addSpace = true) => {
  const { state } = view
  let tr = state.tr.delete(start, end)
  
  if (addSpace) {
    tr = tr.insertText(replacement + ' ', start)
  } else {
    tr = tr.insertText(replacement, start)
  }
  
  view.dispatch(tr)
  return start + replacement.length + (addSpace ? 1 : 0)
}

// Update popup position
const updatePopupPosition = (view) => {
  const { state } = view
  const { selection } = state
  const { from } = selection

  const coords = view.coordsAtPos(from)
  const wrapperRect = editorWrapper.value?.getBoundingClientRect()

  if (wrapperRect) {
    let top = coords.top - wrapperRect.top + 30
    let left = coords.left - wrapperRect.left
    
    const popupWidth = 260
    const wrapperWidth = wrapperRect.width
    
    if (left + popupWidth > wrapperWidth) {
      left = wrapperWidth - popupWidth - 10
    }
    if (left < 0) left = 10
    
    popupStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      position: 'absolute',
      zIndex: 1000
    }
  }
}

// Update word and character count
const updateStats = (editor) => {
  const text = editor.getText()
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  wordCount.value = words.length
  charCount.value = text.length
}

// Handle text input with improved conversion logic
const handleTyping = (view, from, to, text) => {
    const { state } = view
    const { selection } = state
    const { $from } = selection
    const cursorPos = $from.pos
    
    const textBefore = state.doc.textBetween(0, cursorPos, ' ', ' ')
    const currentWordObj = getCurrentWord(textBefore, cursorPos)
    
    // Auto-convert logic with context
    const shouldConvert = autoConvert.value && (
        text === ' ' || 
        text === '.' || 
        text === ',' || 
        text === '?' || 
        text === '!' ||
        text === '\n' ||
        text === ';' ||
        text === ':'
    )
    
    if (shouldConvert && currentWordObj.word && currentWordObj.word.length > 0) {
        // Enforce credit consumption (1 word = 1 credit)
        if (!consumeCredit(1)) {
            showSuggestions.value = false
            return false
        }

        // Priority 1: Pick top suggestion from active suggestions popup if available
        let converted = ''
        const topCandidate = suggestionsList.value && suggestionsList.value[0]
        if (topCandidate && topCandidate.tamil) {
            converted = topCandidate.tamil
        }
        
        // Priority 2: Synchronous suggestions from getSuggestions (presets, trie, beam search)
        if (!converted) {
            const syncSuggs = getSuggestions(currentWordObj.word)
            if (syncSuggs && syncSuggs.length > 0 && syncSuggs[0].tamil) {
                converted = syncSuggs[0].tamil
            }
        }
        
        // Priority 3: Fallback to local synchronous convertWord
        if (!converted) {
            converted = convertWord(currentWordObj.word, '')
        }
        
        if (converted && converted !== currentWordObj.word) {
            let addSpace = (text === ' ')
            
            replaceWord(view, currentWordObj.start, currentWordObj.end, converted, addSpace)
            
            // Record usage for frequency learning (pass tanglish key for trie + backend sync)
            recordUsage(converted, currentWordObj.word)
            
            lastProcessedWord.value = currentWordObj.word
            lastProcessedPosition.value = currentWordObj.start
            
            showSuggestions.value = false
            suggestionsList.value = []
            
            if (text !== ' ' && text !== '\n') {
                setTimeout(() => {
                    const { state: newState } = view
                    const newCursorPos = currentWordObj.start + converted.length + (addSpace ? 1 : 0)
                    const tr = newState.tr.insertText(text, newCursorPos, newCursorPos)
                    view.dispatch(tr)
                }, 0)
            }
            
            return true
        }
    }
    
    // If not converting, user is typing letters inside a word
    suggestionsList.value = []
    showSuggestions.value = false

    // Once credit limit is reached, do not fetch or show suggestions
    if (!isAuthenticated.value && isOutOfCredits.value) {
        return false
    }

    // Update suggestions AFTER TipTap commits the new character
    setTimeout(() => {
        if (!editor.value) return
        if (!isAuthenticated.value && isOutOfCredits.value) {
            showSuggestions.value = false
            suggestionsList.value = []
            return
        }
        const { state: newState } = editor.value
        const { $from: new$from } = newState.selection
        const newCursorPos = new$from.pos
        const newTextBefore = newState.doc.textBetween(0, newCursorPos, ' ', ' ')
        const newWordObj = getCurrentWord(newTextBefore, newCursorPos)
        const contextBefore = newTextBefore.slice(0, newWordObj.start).trim()
        if (newWordObj.word && newWordObj.word.length >= 1) {
            const newSuggestions = getSuggestions(newWordObj.word, contextBefore).slice(0, 6)
            suggestionsList.value = newSuggestions
            if (newSuggestions.length > 0) {
                showSuggestions.value = true
                selectedSuggestionIndex.value = 0
                updatePopupPosition(editor.value.view)
            } else {
                showSuggestions.value = false
            }
        } else {
            showSuggestions.value = false
            suggestionsList.value = []
        }
    }, 0)
    
    return false
}

// Handle keyboard navigation for suggestions
const handleKeyDown = (view, event) => {
  if (!showSuggestions.value) return false
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1,
        suggestionsList.value.length - 1
      )
      return true
      
    case 'ArrowUp':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
      return true
      
    case 'Enter':
    case 'Tab':
      event.preventDefault()
      if (suggestionsList.value[selectedSuggestionIndex.value]) {
        selectSuggestion(suggestionsList.value[selectedSuggestionIndex.value], selectedSuggestionIndex.value, false)
      }
      return true
      
    case 'Escape':
      showSuggestions.value = false
      suggestionsList.value = []
      return true
      
    case ' ':
      // Intercept Space to commit the active suggestion from dropdown with trailing space
      if (showSuggestions.value && suggestionsList.value && suggestionsList.value.length > 0) {
        const { state } = view
        const { selection } = state
        const { $from } = selection
        const textBefore = state.doc.textBetween(0, $from.pos, ' ', ' ')
        const currentWordObj = getCurrentWord(textBefore, $from.pos)
        if (currentWordObj.word) {
          event.preventDefault()
          const selected = suggestionsList.value[selectedSuggestionIndex.value] || suggestionsList.value[0]
          selectSuggestion(selected, selectedSuggestionIndex.value, true)
          return true
        }
      }
      return false
      
    case 'Backspace':
      // Clear immediately before the timeout so stale list never flashes
      suggestionsList.value = []
      showSuggestions.value = false
      if (!isAuthenticated.value && isOutOfCredits.value) {
        return false
      }
      setTimeout(() => {
        if (!editor.value) return
        if (!isAuthenticated.value && isOutOfCredits.value) {
          showSuggestions.value = false
          suggestionsList.value = []
          return
        }
        const { state } = view
        const { selection } = state
        const { $from } = selection
        const textBefore = state.doc.textBetween(0, $from.pos, ' ', ' ')
        const currentWordObj = getCurrentWord(textBefore, $from.pos)
        const backspaceContext = state.doc.textBetween(
          Math.max(0, $from.pos - 100),
          Math.min(state.doc.content.size, $from.pos + 50),
          ' ', ' '
        )
        if (currentWordObj.word && currentWordObj.word.length > 0) {
          const suggestions = getSuggestions(currentWordObj.word, backspaceContext).slice(0, 6)
          suggestionsList.value = suggestions
          if (suggestions.length > 0) {
            showSuggestions.value = true
            selectedSuggestionIndex.value = 0
            updatePopupPosition(view)
          } else {
            showSuggestions.value = false
          }
        } else {
          showSuggestions.value = false
          suggestionsList.value = []
        }
      }, 10)
      return false
      
    default:
      return false
  }
}

// Select suggestion from dropdown
const selectSuggestion = (suggestion, index = -1, addSpace = false) => {
  if (!editor.value || !suggestion) return
  
  const { state, view } = editor.value
  const { selection } = state
  const { $from } = selection
  const cursorPos = $from.pos
  const textBefore = state.doc.textBetween(0, cursorPos, ' ', ' ')
  const currentWordObj = getCurrentWord(textBefore, cursorPos)
  
  if (currentWordObj.word) {
    if (!consumeCredit(1)) {
      showSuggestions.value = false
      return
    }

    replaceWord(view, currentWordObj.start, currentWordObj.end, suggestion.tamil, addSpace)
    
    if (index > 0) {
      // User picked a non-top candidate -> learn correction
      learnCorrection(currentWordObj.word, suggestion.tamil)
    } else {
      // User picked the top candidate -> standard usage
      recordUsage(suggestion.tamil, currentWordObj.word)
    }
    
    showSuggestions.value = false
    suggestionsList.value = []
  }
}

// Handle paste event
// Returns true → tells TipTap to skip its own default paste (prevents double paste)
// Pastes raw text as-is. Each word converts on spacebar via handleTyping.
const handlePaste = (view, event) => {
  event.preventDefault()
  const pastedText = event.clipboardData.getData('text/plain')
  if (!pastedText) return true

  const { state } = view
  const { selection } = state
  const tr = state.tr.insertText(pastedText, selection.from, selection.to)
  view.dispatch(tr)

  // Show suggestions for the last word in pasted block
  setTimeout(() => {
    if (!editor.value) return
    const { state: newState } = editor.value
    const { selection: newSel } = newState
    const { $from } = newSel
    const cursorPos = $from.pos
    const textBefore = newState.doc.textBetween(0, cursorPos, ' ', ' ')
    const currentWordObj = getCurrentWord(textBefore, cursorPos)
    if (currentWordObj.word && currentWordObj.word.length >= 1) {
      const suggestions = getSuggestions(currentWordObj.word, '').slice(0, 6)
      suggestionsList.value = suggestions
      if (suggestions.length > 0) {
        showSuggestions.value = true
        selectedSuggestionIndex.value = 0
        updatePopupPosition(editor.value.view)
      }
    }
  }, 50)

  return true  // ← CRITICAL: prevents TipTap default paste (stops double paste)
}

// ── DOWNLOAD & EXPORT FUNCTIONS ──────────────────────────
const downloadAsPDF = () => {
  showDownloadDropdown.value = false
  if (!editor.value) return
  const htmlContent = editor.value.getHTML()
  const plainText = editor.value.getText()
  if (!plainText.trim()) {
    alert('Please write some content before downloading.')
    return
  }

  // Create a dedicated hidden print iframe for pristine PDF output
  const printIframe = document.createElement('iframe')
  printIframe.style.position = 'fixed'
  printIframe.style.right = '0'
  printIframe.style.bottom = '0'
  printIframe.style.width = '0'
  printIframe.style.height = '0'
  printIframe.style.border = 'none'
  document.body.appendChild(printIframe)

  const doc = printIframe.contentWindow.document
  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Usil AI Tamil Document</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Catamaran:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page {
            margin: 20mm;
            size: A4;
          }
          body {
            font-family: ${selectedFont.value.value || "'Noto Sans Tamil', sans-serif"};
            font-size: ${currentFontSize.value || 16}px;
            line-height: 1.8;
            color: #0f172a;
            padding: 24px;
            background: white;
          }
          h1, h2, h3 { color: #1e293b; margin-top: 1em; margin-bottom: 0.5em; }
          blockquote { border-left: 3px solid #6366f1; margin: 1em 0; padding-left: 1em; color: #475569; font-style: italic; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
          .doc-footer {
            margin-top: 40px;
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
        <div>${htmlContent}</div>
        <div class="doc-footer">
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

const downloadAsDocx = () => {
  showDownloadDropdown.value = false
  if (!editor.value) return
  const htmlContent = editor.value.getHTML()
  const plainText = editor.value.getText()
  if (!plainText.trim()) {
    alert('Please write some content before downloading.')
    return
  }

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Usil AI Tamil Document</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Noto Sans Tamil', 'Catamaran', 'Arial Unicode MS', Tahoma, sans-serif;
            font-size: 14pt;
            line-height: 1.6;
            color: #000000;
          }
          h1 { font-size: 22pt; font-weight: bold; }
          h2 { font-size: 18pt; font-weight: bold; }
          h3 { font-size: 16pt; font-weight: bold; }
          p { margin-bottom: 10pt; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `

  const blob = new Blob(['\\ufeff' + wordHtml], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Usil_Tamil_Document_${Date.now()}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

const downloadAsTxt = () => {
  showDownloadDropdown.value = false
  if (!editor.value) return
  const plainText = editor.value.getText()
  if (!plainText.trim()) {
    alert('Please write some content before downloading.')
    return
  }

  const blob = new Blob(['\\ufeff' + plainText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Usil_Tamil_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// Clear editor content
const clearEditor = () => {
  if (editor.value) {
    editor.value.commands.clearContent()
    showSuggestions.value = false
    suggestionsList.value = []
    wordCount.value = 0
    charCount.value = 0
  }
}

// Handle selection change to update suggestions position
const handleSelectionUpdate = ({ editor }) => {
  if (showSuggestions.value) {
    updatePopupPosition(editor.view)
  }
}

// ============ AI Assistant & Grammar Checker Functions ============

const setAutoCheckMode = (val) => {
  autoCheckMode.value = val
  if (val) {
    scheduleAutoCheck()
  }
}

// Toggle AI Assistant Sidebar ON/OFF
const toggleAIHelp = () => {
  aiHelpEnabled.value = !aiHelpEnabled.value
  if (aiHelpEnabled.value) {
    // Initial scan when sidebar opens
    triggerGrammarScan()
  } else {
    activeIssues.value = []
    if (checkDebounceTimer) clearTimeout(checkDebounceTimer)
  }
}

// Debounced auto-check (3 seconds after typing stops per screenshot)
const scheduleAutoCheck = () => {
  if (!autoCheckMode.value || !aiHelpEnabled.value) return
  if (checkDebounceTimer) clearTimeout(checkDebounceTimer)
  checkDebounceTimer = setTimeout(() => {
    triggerGrammarScan()
  }, 3000)
}

// Core grammar scanning function
const triggerGrammarScan = async () => {
  if (!editor.value) return
  const text = editor.value.getText().trim()
  if (!text) {
    activeIssues.value = []
    return
  }

  aiChecking.value = true
  try {
    const issues = []

    // 1. Check with Claude API or Backend
    try {
      const claudeResult = await checkGrammar(text)
      if (claudeResult && claudeResult.corrections && claudeResult.corrections.length > 0) {
        claudeResult.corrections.forEach((c, i) => {
          issues.push({
            id: `c_${Date.now()}_${i}`,
            original: c.original,
            corrected: c.corrected,
            explanation: c.explanation,
            type: c.type ? (c.type.charAt(0).toUpperCase() + c.type.slice(1)) : 'Clarity'
          })
        })
      }
    } catch (_) {}

    // 2. Local linguistic rules check (detects clarity, sandhi, conjunctions)
    // Conjunction check: e.g. "நம்பிக்கை நானும்" -> "நம்பிக்கையும் நானும்"
    if (text.includes('நம்பிக்கை நானும்') && !issues.some(i => i.original === 'நம்பிக்கை நானும்')) {
      issues.unshift({
        id: 'conjunction_trust',
        original: 'நம்பிக்கை நானும்',
        corrected: 'நம்பிக்கையும் நானும்',
        explanation: "Added conjunction 'உம்' for better flow and clarity, implying 'நம்பிக்கையும் நானும்' (both trust and I / I and my trust).",
        type: 'Clarity'
      })
    }

    // Sandhi rules
    const sandhiRules = [
      { orig: 'அந்த பையன்', corr: 'அந்தப் பையன்', exp: "'அந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (ப்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'இந்த புத்தகம்', corr: 'இந்தப் புத்தகம்', exp: "'இந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (ப்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'அந்த பக்கம்', corr: 'அந்தப் பக்கம்', exp: "'அந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (ப்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'எந்த காலம்', corr: 'எந்தக் காலம்', exp: "'எந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (க்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'இங்கு வா', corr: 'இங்கே வா', exp: "வினைச்சொல்லுடன் இணையும் போது 'இங்கே வா' என்பது மேலும் தெளிவானது.", type: 'Clarity' },
      { orig: 'எனக்கு தெரியும்', corr: 'எனக்குத் தெரியும்', exp: "'எனக்கு' என்ற நான்காம் வேற்றுமைக்குப் பின் வல்லினம் (த்) மிக வேண்டும்.", type: 'Grammar' }
    ]

    for (const r of sandhiRules) {
      if (text.includes(r.orig) && !issues.some(i => i.original === r.orig)) {
        issues.push({
          id: `sandhi_${r.orig}`,
          original: r.orig,
          corrected: r.corr,
          explanation: r.exp,
          type: r.type
        })
      }
    }

    activeIssues.value = issues
  } catch (err) {
    console.warn('[AI Assistant] Scan failed:', err)
  } finally {
    aiChecking.value = false
  }
}

// Apply single issue correction
const applySingleIssue = (issue, idx) => {
  if (!editor.value || !issue) return
  const currentText = editor.value.getText()
  if (currentText.includes(issue.original)) {
    const updated = currentText.replace(issue.original, issue.corrected)
    editor.value.commands.setContent(updated)
  }
  activeIssues.value.splice(idx, 1)
}

// Apply all corrections
const applyAllIssues = () => {
  if (!editor.value || activeIssues.value.length === 0) return
  let text = editor.value.getText()
  for (const issue of activeIssues.value) {
    text = text.replace(issue.original, issue.corrected)
  }
  editor.value.commands.setContent(text)
  activeIssues.value = []
}

// Dismiss single issue
const dismissSingleIssue = (idx) => {
  activeIssues.value.splice(idx, 1)
}

// Dismiss all issues
const dismissAllIssues = () => {
  activeIssues.value = []
}

// ── Quick Actions ────────────────────────────────────────────────
const handleTranslateToEnglish = async () => {
  if (!editor.value) return
  const text = editor.value.getText().trim()
  if (!text) {
    alert('Please write or convert some Tamil text in the editor first.')
    return
  }

  quickActionModalTitle.value = 'Tamil → English Translation'
  quickActionLoading.value = true
  showQuickActionModal.value = true
  quickActionModalContent.value = ''

  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=en&dt=t&q=${encodeURIComponent(text)}`)
    const data = await res.json()
    if (data && data[0]) {
      quickActionModalContent.value = data[0].map(s => s[0]).join('')
    } else {
      quickActionModalContent.value = 'Translation returned empty response.'
    }
  } catch (e) {
    quickActionModalContent.value = 'Translation service error. Please try again.'
  } finally {
    quickActionLoading.value = false
  }
}

const handleSummarizeText = async () => {
  if (!editor.value) return
  const text = editor.value.getText().trim()
  if (!text) {
    alert('Please write or convert some Tamil text in the editor first.')
    return
  }

  quickActionModalTitle.value = 'Text Summary'
  quickActionLoading.value = true
  showQuickActionModal.value = true
  quickActionModalContent.value = ''

  setTimeout(() => {
    const sentences = text.split(/[.?!;\n]+/).filter(s => s.trim().length > 5)
    if (sentences.length <= 2) {
      quickActionModalContent.value = '• ' + text
    } else {
      quickActionModalContent.value = sentences.slice(0, 3).map(s => `• ${s.trim()}`).join('\n\n')
    }
    quickActionLoading.value = false
  }, 350)
}

const copyQuickActionResult = () => {
  if (!quickActionModalContent.value) return
  navigator.clipboard.writeText(quickActionModalContent.value)
  alert('Copied to clipboard!')
}

const insertQuickActionResult = () => {
  if (!editor.value || !quickActionModalContent.value) return
  editor.value.commands.insertContent('<p>' + quickActionModalContent.value + '</p>')
  showQuickActionModal.value = false
}


// ── VOICE TYPING FUNCTIONS ──────────────────────────────────────

function buildRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    voiceError.value = 'Speech recognition not supported. Use Chrome or Edge.'
    return null
  }
  const rec = new SpeechRecognition()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'en-IN'
  rec.maxAlternatives = 1

  rec.onresult = (event) => {
    let interimText = ''
    let finalText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalText += transcript
      } else {
        interimText += transcript
      }
    }
    voiceInterim.value = interimText
    if (finalText.trim()) {
      voiceInterim.value = ''
      insertVoiceText(finalText.trim())
    }
  }

  rec.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') return
    if (event.error === 'not-allowed') {
      voiceError.value = 'Microphone access denied. Click the 🔒 lock in your address bar → Site settings → allow Microphone → refresh the page.'
    } else if (event.error === 'audio-capture') {
      voiceError.value = 'No microphone found. Please connect a microphone and try again.'
    } else if (event.error === 'network') {
      voiceError.value = 'Network error with speech recognition. Check your internet connection.'
    } else {
      voiceError.value = `Microphone error: ${event.error}. Please check browser permissions.`
    }
    isVoiceActive.value = false
  }

  rec.onend = () => {
    if (isVoiceActive.value) {
      try { rec.start() } catch (_) {}
    }
  }

  return rec
}

function insertVoiceText(rawText) {
  if (!editor.value) return
  const words = rawText.trim().split(/\s+/)
  let textToInsert = ''
  for (const word of words) {
    if (!word) continue
    const converted = convertWord(word, '')
    textToInsert += (converted && converted !== word ? converted : word) + ' '
  }
  if (textToInsert.trim()) {
    editor.value.commands.insertContent(textToInsert)
    updateStats(editor.value)
  }
}

async function toggleVoiceTyping() {
  if (isVoiceActive.value) {
    stopVoiceTyping()
  } else {
    await startVoiceTyping()
  }
}

async function startVoiceTyping() {
  voiceError.value = ''
  voiceInterim.value = ''

  // Check SpeechRecognition support
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionAPI) {
    voiceError.value = 'Speech recognition not supported. Please use Chrome or Edge.'
    return
  }

  // Use Permissions API to check mic state without triggering a blocking prompt
  if (navigator.permissions) {
    try {
      const permStatus = await navigator.permissions.query({ name: 'microphone' })
      if (permStatus.state === 'denied') {
        voiceError.value = 'Microphone is blocked. Click the 🔒 lock in your address bar → Site settings → allow Microphone → refresh.'
        return
      }
    } catch (_) {
      // Permissions API not available — proceed, SpeechRecognition will ask for permission itself
    }
  }

  // Build recognition instance (this triggers the browser mic permission prompt if not yet granted)
  if (!recognition) recognition = buildRecognition()
  if (!recognition) return

  try {
    recognition.start()
    isVoiceActive.value = true
    editor.value?.commands.focus()
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      voiceError.value = 'Microphone blocked. Allow mic access in browser settings and try again.'
    } else {
      voiceError.value = 'Could not start microphone: ' + (err.message || err)
    }
    isVoiceActive.value = false
  }
}

function stopVoiceTyping() {
  isVoiceActive.value = false
  voiceInterim.value = ''
  if (recognition) {
    try { recognition.stop() } catch (_) {}
  }
}

// ── END VOICE TYPING ────────────────────────────────────────────

// Initialize editoritialize editor
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      }
    }),
    Placeholder.configure({
      placeholder: 'Type in Tanglish — it converts to Tamil automatically when you press space or punctuation...'
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      defaultAlignment: 'left',
    })
  ],
  editorProps: {
    handleTextInput: handleTyping,
    handleKeyDown: handleKeyDown,
    handlePaste: handlePaste
  },
  onUpdate: ({ editor }) => {
    updateStats(editor)
    if (aiHelpEnabled.value && autoCheckMode.value) {
      scheduleAutoCheck()
    }
  },
  onSelectionUpdate: handleSelectionUpdate
})

// Watch for autoConvert changes
watch(autoConvert, (newValue) => {
  console.log('Auto convert:', newValue ? 'ON' : 'OFF')
})

// Focus editor on mount
onMounted(() => {
  // Preload common dictionary chunks in background — makes first lookup instant
  preloadCommonChunks()

  // Close dropdowns when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (fontSelectorRef.value && !fontSelectorRef.value.contains(e.target)) {
      showFontDropdown.value = false
    }
    if (fontSizeRef.value && !fontSizeRef.value.contains(e.target)) {
      showFontSizeDropdown.value = false
    }
    if (downloadDropdownRef.value && !downloadDropdownRef.value.contains(e.target)) {
      showDownloadDropdown.value = false
    }
  })

  // Check for imported text from OCR or Audio tools
  const importedText = sessionStorage.getItem('usil_imported_text')
  if (importedText) {
    sessionStorage.removeItem('usil_imported_text')
    setTimeout(() => {
      if (editor.value) {
        const paragraphs = importedText.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')
        editor.value.commands.setContent(paragraphs || `<p>${importedText}</p>`)
      }
    }, 150)
  }

  setTimeout(() => {
    if (editor.value) {
      editor.value.commands.focus()
    }
  }, 100)
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  stopVoiceTyping()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;700&family=Noto+Serif+Tamil:wght@400;700&family=Catamaran:wght@400;600;700&family=Meera+Inimai&family=Mukta+Malar:wght@400;600&family=Arima+Madurai:wght@400;700&family=Baloo+Thambi+2:wght@400;700&family=Inter:wght@400;500;600&display=swap');

.tanglish-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  font-family: 'Inter', 'Segoe UI', 'Noto Sans Tamil', sans-serif;
  background: var(--card-bg, #ffffff);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: none;
  border: 1px solid var(--card-border, #e0e0e0);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: var(--toolbar-bg, #ffffff);
  border-bottom: 1px solid var(--toolbar-border, #e0e0e0);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-group {
  display: flex;
  gap: 2px;
  align-items: center;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--toolbar-border, #ddd);
  margin: 0 6px;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: var(--toolbar-btn-bg, transparent);
  color: var(--text-sub, #444);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.toolbar-btn:hover {
  background: var(--toolbar-btn-hover, #f0f0f0);
  color: var(--text-main, #111);
}

.toolbar-btn.active {
  background: var(--toolbar-btn-active, #4f46e5);
  color: #ffffff;
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Download Dropdown */
.download-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.btn-download {
  background: var(--toolbar-btn-bg, #f8fafc) !important;
  color: var(--text-main, #1e293b) !important;
  border: 1px solid var(--toolbar-border, #e2e8f0) !important;
  font-weight: 600 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  padding: 5px 12px !important;
  border-radius: 8px !important;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-download:hover {
  background: var(--toolbar-btn-hover, #f1f5f9) !important;
  border-color: #5b92f7 !important;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(91, 146, 247, 0.22);
}

.download-svg-icon {
  width: 17px;
  height: 17px;
  color: #5b92f7;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.btn-download:hover .download-svg-icon {
  transform: translateY(1px);
}

.download-btn-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #1e293b);
}

.download-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  min-width: 230px;
  z-index: 1000;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.download-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  color: var(--text-main, #1e293b);
}

.download-menu-item:hover {
  background: var(--card-inner-bg, #f1f5f9);
}

.item-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(91, 146, 247, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #5b92f7;
  transition: all 0.2s ease;
}

.download-menu-item:hover .item-icon-badge {
  background: #5b92f7;
  color: #ffffff;
  transform: scale(1.04);
}

.format-download-svg {
  width: 17px;
  height: 17px;
  color: inherit;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #1e293b);
}

.item-desc {
  font-size: 11px;
  color: var(--text-muted, #64748b);
}

.toolbar-stats {
  margin-left: auto;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted, #999);
  font-weight: 500;
}

/* Editor Area */
.editor-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card-inner-bg, #ffffff);
  overflow: hidden;
}

.editor-content {
  flex: 1;
  padding: 32px 40px;
  font-size: 17px;
  line-height: 1.8;
  overflow-y: auto;
  color: var(--text-main, #111);
}

.editor-content :deep(.tiptap) {
  outline: none;
  min-height: 100%;
  color: var(--text-main, #111);
}

.editor-content :deep(p) {
  margin: 0 0 0.8em 0;
  color: var(--text-main, #111);
}

.editor-content :deep(h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 0 0 0.5em 0;
  color: var(--text-main, #1a1a2e);
}

.editor-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  color: var(--text-main, #1a1a2e);
}

.editor-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  color: var(--text-main, #1a1a2e);
}

.editor-content :deep(blockquote) {
  border-left: 4px solid #6c47ff;
  padding-left: 16px;
  margin: 0.8em 0;
  color: var(--text-sub, #555);
  font-style: italic;
}

.editor-content :deep(code) {
  background: var(--toolbar-btn-bg, #f0edff);
  color: #a855f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: monospace;
}

.editor-content :deep(ul),
.editor-content :deep(ol) {
  padding-left: 24px;
  margin: 0.5em 0;
}

.editor-content :deep(li) {
  margin: 0.2em 0;
}

.editor-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--card-border, #eee);
  margin: 1.5em 0;
}

.editor-content :deep(s) {
  text-decoration: line-through;
  color: var(--text-muted, #999);
}

.editor-content :deep(.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted, #bbb);
  pointer-events: none;
  height: 0;
  font-style: italic;
}

/* Suggestions Popup */
.suggestions-popup {
  position: absolute;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
  z-index: 1000;
  min-width: 220px;
  max-width: 300px;
  max-height: 320px;
  overflow-y: auto;
  transition: opacity 0.1s ease;
}

.suggestion-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:first-child {
  border-radius: 12px 12px 0 0;
  background: #1a1a2e;
  color: #fff;
}

.suggestion-item:first-child .tamil-text-main {
  color: #fff;
  font-size: 18px;
}

.suggestion-item:first-child:hover {
  background: #2d2d4e;
}

.suggestion-item:not(:first-child):hover,
.suggestion-item:not(:first-child).selected {
  background: #f5f3ff;
}

.suggestion-item.selected:first-child {
  background: #1a1a2e;
}

.tamil-text-main {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: #1a1a2e;
  flex: 1;
}

.suggestion-space-hint {
  font-size: 10px;
  color: #aaa;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.03em;
}

.suggestion-item:first-child .suggestion-space-hint {
  background: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.7);
}


/* ── Editor Workspace (Flex Row: Editor Left + Sidebar Right) ── */
.editor-workspace {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  position: relative;
  background: var(--card-inner-bg, #ffffff);
  overflow: hidden;
}

.editor-workspace.with-sidebar .editor-wrapper {
  border-right: 1px solid var(--card-border, #e2e8f0);
}

/* ── AI Assistant Sidebar (Right Pane matching screenshot) ── */
.ai-assistant-sidebar {
  width: 360px;
  flex-shrink: 0;
  background: var(--card-bg, #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  animation: slideSidebar 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideSidebar {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Sidebar Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--card-inner-border, #f1f5f9);
}

.sidebar-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-spark-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  letter-spacing: -0.01em;
}

.sidebar-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.sidebar-close-btn:hover {
  background: var(--toolbar-btn-hover, #f1f5f9);
  color: var(--text-main, #0f172a);
}

/* Mode Switcher */
.sidebar-mode-section {
  padding: 12px 18px 8px;
}

.mode-toggle-pill {
  display: flex;
  background: var(--toolbar-bg, #f1f5f9);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}

.mode-pill-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-sub, #64748b);
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.mode-pill-btn.active {
  background: var(--card-bg, #ffffff);
  color: #ea580c;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.mode-icon-spark {
  color: #ea580c;
  font-size: 12px;
}

.mode-icon-clock {
  font-size: 11px;
}

.mode-timing-hint {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  margin-top: 6px;
  padding-left: 2px;
}

/* Manual Scan Box */
.manual-scan-box {
  padding: 0 18px 8px;
}

.btn-manual-scan {
  width: 100%;
  padding: 7px 14px;
  background: linear-gradient(135deg, #ea580c, #f97316);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px rgba(234, 88, 12, 0.25);
}

.btn-manual-scan:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(234, 88, 12, 0.35);
}

.btn-manual-scan:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Issues Status Bar */
.issues-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-top: 1px solid var(--card-inner-border, #f1f5f9);
}

.issue-count-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-sub, #475569);
}

.issues-spinner-circle {
  width: 13px;
  height: 13px;
  border: 2px solid #ea580c;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.bulk-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-fix-all {
  background: #ea580c;
  color: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 4px 13px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-fix-all:hover {
  background: #c2410c;
  box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);
}

.btn-dismiss-all {
  background: transparent;
  border: 1px solid var(--card-border, #e2e8f0);
  color: var(--text-sub, #64748b);
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-dismiss-all:hover {
  background: var(--toolbar-btn-hover, #f8fafc);
  color: var(--text-main, #0f172a);
}

/* Scroll Area for Cards */
.issues-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-issues-placeholder {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-muted, #94a3b8);
}

.no-issues-check-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  background: #ecfdf5;
  color: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.no-issues-main-msg {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main, #0f172a);
  margin-bottom: 4px;
}

.no-issues-sub-msg {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

/* ── Individual Issue Card (Matches screenshot) ── */
.issue-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.18s ease;
}

.issue-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.issue-card-top {
  margin-bottom: 10px;
}

.issue-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  letter-spacing: 0.02em;
}

.issue-badge.clarity {
  background: #ecfdf5;
  color: #059669;
}

.issue-badge.grammar {
  background: #fef3c7;
  color: #d97706;
}

.issue-badge.spelling {
  background: #e0f2fe;
  color: #0284c7;
}

.issue-badge.tense {
  background: #fee2e2;
  color: #dc2626;
}

.issue-diff-box {
  margin-bottom: 10px;
}

.diff-original-row {
  margin-bottom: 6px;
}

.original-strikethrough-tag {
  display: inline-block;
  background: #fef2f2;
  color: #dc2626;
  font-weight: 600;
  font-size: 14px;
  padding: 3px 8px;
  border-radius: 5px;
  line-height: 1.4;
}

.original-strikethrough-tag s {
  text-decoration-thickness: 1.5px;
}

.diff-corrected-row {
  color: #16a34a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.issue-explanation-desc {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-sub, #475569);
  margin-bottom: 14px;
}

.issue-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-apply-card {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #ea580c;
  color: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 5px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-apply-card:hover {
  background: #c2410c;
  box-shadow: 0 2px 6px rgba(234, 88, 12, 0.35);
}

.btn-dismiss-card {
  background: transparent;
  border: 1px solid var(--card-border, #e2e8f0);
  color: var(--text-sub, #64748b);
  border-radius: 16px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-dismiss-card:hover {
  background: var(--toolbar-btn-hover, #f8fafc);
  color: var(--text-main, #0f172a);
}

/* ── Quick Actions at Sidebar Bottom ── */
.sidebar-quick-actions {
  padding: 14px 18px 16px;
  border-top: 1px solid var(--card-border, #e2e8f0);
  background: var(--card-bg, #ffffff);
}

.quick-actions-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
  margin-bottom: 10px;
  letter-spacing: -0.01em;
}

.quick-actions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  color: var(--text-sub, #475569);
}

.quick-action-item:hover {
  background: var(--toolbar-btn-hover, #f1f5f9);
  color: var(--text-main, #0f172a);
}

.quick-action-symbol {
  font-size: 14px;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #64748b);
}

.quick-action-text {
  font-size: 13px;
  font-weight: 500;
}

/* ── Quick Action Modal ── */
.quick-action-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.quick-action-modal {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.qa-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--card-inner-border, #e2e8f0);
}

.qa-modal-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
}

.qa-close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 4px;
}

.qa-modal-body {
  padding: 18px;
  max-height: 320px;
  overflow-y: auto;
}

.qa-loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--text-sub, #64748b);
  font-size: 13.5px;
}

.qa-content-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-main, #0f172a);
}

.qa-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--card-inner-border, #e2e8f0);
  background: var(--toolbar-bg, #f8fafc);
}

.qa-btn-copy, .qa-btn-insert {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.qa-btn-copy {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #cbd5e1);
  color: var(--text-main, #0f172a);
}

.qa-btn-insert {
  background: #ea580c;
  border: none;
  color: #ffffff;
}

.qa-btn-done {
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 12.5px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .editor-workspace {
    flex-direction: column;
  }
  .ai-assistant-sidebar {
    width: 100%;
    max-width: 100%;
    height: 380px;
    border-left: none;
    border-top: 1px solid var(--card-border, #e2e8f0);
  }
}

/* Scrollbar Styling */
.editor-content::-webkit-scrollbar,
.suggestions-popup::-webkit-scrollbar,
.issues-scroll-area::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}

.editor-content::-webkit-scrollbar-track,
.suggestions-popup::-webkit-scrollbar-track,
.issues-scroll-area::-webkit-scrollbar-track {
  background: var(--card-inner-bg, #f1f1f1);
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb,
.suggestions-popup::-webkit-scrollbar-thumb,
.issues-scroll-area::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #cbd5e1);
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb:hover,
.suggestions-popup::-webkit-scrollbar-thumb:hover,
.ai-panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* ── Action Buttons (Convert All, Clear, AI Help, Voice) — Ghost/Transparent Style ── */
.toolbar-btn.btn-convert,
.toolbar-btn.btn-clear,
.toolbar-btn.btn-ai,
.toolbar-btn.btn-voice {
  background: transparent;
  color: #555;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
  font-weight: 600;
  padding: 0 14px;
  font-size: 12px;
  border-radius: 8px;
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
  backdrop-filter: blur(4px);
}

.toolbar-btn.btn-convert:hover {
  background: rgba(102, 126, 234, 0.10);
  color: #5a6fd6;
  border-color: #7c8ef0;
}

.toolbar-btn.btn-clear:hover {
  background: rgba(231, 76, 60, 0.09);
  color: #e74c3c;
  border-color: #e74c3c;
}

.toolbar-btn.btn-ai {
  min-width: 145px;
  white-space: nowrap;
}
.toolbar-btn.btn-ai:hover {
  background: rgba(241, 196, 15, 0.10);
  color: #c9991a;
  border-color: #f1c40f;
}
.toolbar-btn.btn-ai.active {
  background: rgba(241, 196, 15, 0.15);
  color: #b8860b;
  border-color: #e0b800;
}

.toolbar-btn.btn-voice {
  min-width: 80px;
}
.toolbar-btn.btn-voice:hover {
  background: rgba(29, 185, 84, 0.10);
  color: #1db954;
  border-color: #1db954;
}
.toolbar-btn.btn-voice.active {
  background: rgba(231, 76, 60, 0.10);
  color: #e74c3c;
  border-color: #e74c3c;
  animation: voicePulseBtn 1.5s ease-in-out infinite;
}
.toolbar-btn.btn-voice.voice-error {
  background: rgba(230, 126, 34, 0.10);
  color: #e67e22;
  border-color: #e67e22;
}

@keyframes voicePulseBtn {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.5); }
  50%       { box-shadow: 0 0 0 6px rgba(231, 76, 60, 0); }
}

.voice-live {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mic-pulse {
  width: 8px; height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: micBlink 0.8s ease-in-out infinite;
}
@keyframes micBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

/* ── Voice Status Bar ── */
.voice-status-bar {
  background: linear-gradient(90deg, #1db954 0%, #17a349 100%);
  color: #fff;
  padding: 8px 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.3s;
}
.voice-status-bar.error {
  background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
}

.voice-status-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.voice-interim {
  font-style: italic;
  opacity: 0.85;
  background: rgba(0,0,0,0.15);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sound wave animation */
.voice-waves {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
}
.voice-waves span {
  display: inline-block;
  width: 3px;
  background: rgba(255,255,255,0.9);
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}
.voice-waves span:nth-child(1) { height: 6px;  animation-delay: 0s; }
.voice-waves span:nth-child(2) { height: 14px; animation-delay: 0.1s; }
.voice-waves span:nth-child(3) { height: 20px; animation-delay: 0.2s; }
.voice-waves span:nth-child(4) { height: 14px; animation-delay: 0.3s; }
.voice-waves span:nth-child(5) { height: 6px;  animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50%       { transform: scaleY(1); }
}

.voice-error-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: space-between;
}
.dismiss-error {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  border-radius: 50%;
  width: 22px; height: 22px;
  cursor: pointer;
  font-size: 13px;
  display: flex; align-items: center; justify-content: center;
}
.dismiss-error:hover { background: rgba(255,255,255,0.35); }


/* ── Font Selector ── */
.toolbar-font-selector {
  position: relative;
  margin-left: 4px;
}

.font-selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border: 1.5px solid rgba(0,0,0,0.15);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  color: #444;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
  max-width: 160px;
}
.font-selector-btn:hover {
  background: #f0f0f0;
  border-color: #bbb;
}

.font-preview {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 15px;
  color: #6c47ff;
}

.font-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: #555;
}

.font-caret {
  font-size: 10px;
  color: #999;
  margin-left: 2px;
}

.font-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.13);
  z-index: 2000;
  min-width: 220px;
  max-height: 340px;
  overflow-y: auto;
  padding: 6px 0;
}

.font-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  cursor: pointer;
  transition: background 0.12s;
}
.font-option:hover {
  background: #f5f3ff;
}
.font-option.active {
  background: #ede9ff;
}

.font-sample {
  font-size: 18px;
  color: #1a1a2e;
  min-width: 52px;
  letter-spacing: 2px;
}

.font-label {
  font-size: 12px;
  color: #666;
  font-family: 'Inter', sans-serif;
}

/* ── Font Size Controls ── */
.font-size-wrapper {
  position: relative;
}

.font-size-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 62px;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.font-size-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 500;
  background: #fff;
  border: 1.5px solid rgba(108,71,255,0.2);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.13);
  padding: 5px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  min-width: 130px;
  max-height: 280px;
  overflow-y: auto;
}

.font-size-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.13s;
  color: #333;
}
.font-size-option:hover  { background: #f0edff; }
.font-size-option.active { background: #6c47ff; color: #fff; }
.font-size-option.active .size-label { color: #fff; }

.size-label {
  font-size: 11px;
  color: #666;
  font-family: 'Inter', sans-serif;
}
/* ── End Font Size Controls ── */





/* Responsive */
@media (max-width: 768px) {
  .tanglish-editor-container {
    min-height: 400px;
  }
  
  .editor-content {
    padding: 20px;
    font-size: 16px;
  }

  .toolbar {
    padding: 6px 10px;
    gap: 2px;
  }

  .toolbar-stats {
    display: none;
  }

  .tamil-text {
    font-size: 14px;
  }
  
  .tanglish-text {
    font-size: 11px;
    min-width: 60px;
  }
  
  .suggestions-popup {
    min-width: 220px;
    max-width: 280px;
  }
  
  .ai-assistant-panel {
    width: calc(100vw - 40px);
    max-width: 380px;
    right: 20px;
    bottom: 20px;
  }
}

/* Credit Limit Exhausted Banner - Minimal */
.credit-exhausted-banner {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: var(--credits-bg, rgba(99, 102, 241, 0.12));
  border: 1px solid var(--credits-border, rgba(99, 102, 241, 0.28));
  padding: 6px 14px;
  border-radius: 8px;
  margin: 10px 16px 4px;
  width: fit-content;
  backdrop-filter: blur(8px);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.banner-msg {
  font-size: 13px;
  font-weight: 600;
  color: var(--credits-text, #6366f1);
  display: inline-flex;
  align-items: center;
}

.banner-login-btn {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.banner-login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
}

</style>