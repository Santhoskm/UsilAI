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
        <button @click="convertAll" class="toolbar-btn btn-convert" title="Convert All Tanglish to Tamil">
          Convert All
        </button>
        <button @click="clearEditor" class="toolbar-btn btn-clear" title="Clear All">
          Clear
        </button>
        <button 
          @click="toggleAIHelp" 
          class="toolbar-btn btn-ai"
          :class="{ active: aiHelpEnabled }"
          :title="aiHelpEnabled ? 'AI Help: ON - Click to turn OFF' : 'AI Help: OFF - Click to turn ON'"
        >
          AI Help {{ aiHelpEnabled ? 'ON' : 'OFF' }}
        </button>
        <button
  @click="toggleVoiceTyping"
  class="toolbar-btn btn-voice"
  :class="{ active: isVoiceActive, 'voice-error': voiceError }"
  :title="isVoiceActive ? 'Stop voice typing' : 'Start voice typing (speak in Tanglish)'"
>
  <span v-if="!isVoiceActive"> Voice Typing</span>
  <span v-else class="voice-live">
    <span class="mic-pulse"></span> Listening...
  </span>
</button>
        <label class="auto-convert">
          <input type="checkbox" v-model="autoConvert" />
          Auto Convert
        </label>
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

    <!-- Voice Status Bar -->
<div v-if="isVoiceActive || voiceError" class="voice-status-bar" :class="{ error: voiceError }">
  <div v-if="!voiceError" class="voice-status-inner">
    <span class="voice-waves">
      <span></span><span></span><span></span><span></span><span></span>
    </span>
    <span>Speak now in Tanglish — words will auto-convert to Tamil</span>
    <span v-if="voiceInterim" class="voice-interim">{{ voiceInterim }}</span>
  </div>
  <div v-else class="voice-error-inner">
    ⚠️ {{ voiceError }}
    <button @click="voiceError = ''" class="dismiss-error">✕</button>
  </div>
</div>

    <!-- Editor Area -->
    <div class="editor-wrapper" ref="editorWrapper">
      <editor-content :editor="editor" class="editor-content" :style="{ fontFamily: selectedFont.value, fontSize: currentFontSize + 'px' }" />



      <!-- Suggestions Popup -->
      <div v-if="showSuggestions && suggestionsList.length > 0"
           class="suggestions-popup"
           :style="popupStyle">
        <div v-for="(suggestion, idx) in suggestionsList"
             :key="idx"
             @click="selectSuggestion(suggestion)"
             :class="{ 'selected': idx === selectedSuggestionIndex }"
             class="suggestion-item">
          <span class="tanglish-text">{{ suggestion.tanglish }}</span>
          <span class="arrow">→</span>
          <span class="tamil-text">{{ suggestion.tamil }}</span>
        </div>
      </div>

      <!-- Floating AI Assistant Panel - Only shows when AI Help is ON -->
      <div v-if="aiHelpEnabled" class="ai-assistant-panel" :style="aiPanelStyle">
        <div class="ai-panel-header" @mousedown="startDrag">
          <span class="ai-icon">🤖</span>
          <span class="ai-title">AI Grammar Assistant</span>
          <button class="ai-close" @click="toggleAIHelp">×</button>
        </div>
        
        <div class="ai-panel-content">
          <!-- Input Area -->
          <textarea
            v-model="aiInputText"
            :placeholder="aiPlaceholder"
            class="ai-input"
            rows="2"
          ></textarea>
          
          <!-- Action Buttons -->
          <div class="ai-actions">
            <button 
              @click="checkGrammarWithAI" 
              :disabled="aiChecking || !aiInputText.trim()"
              class="ai-check-btn"
            >
              <span v-if="!aiChecking">🔍 Check Grammar</span>
              <span v-else>
                <span class="spinner-small"></span>
                Analyzing...
              </span>
            </button>
            <button 
              @click="clearAIInput" 
              class="ai-clear-btn"
              :disabled="aiChecking"
            >
              Clear
            </button>
          </div>

          <!-- AI Response -->
          <div v-if="aiResponse" class="ai-response">
            <div class="response-header">
              <span>✨ Correction Result</span>
              <button @click="applyAICorrection" class="apply-correction-btn">
                Apply to Editor
              </button>
            </div>
            
            <!-- Corrections -->
            <div v-if="aiResponse.corrections && aiResponse.corrections.length > 0" class="corrections-list">
              <div v-for="(correction, idx) in aiResponse.corrections" :key="idx" class="correction-item">
                <div class="correction-badge" :class="correction.type">
                  {{ getTypeIcon(correction.type) }} {{ getTypeLabel(correction.type) }}
                </div>
                <div class="correction-text">
                  <div class="original">❌ {{ correction.original }}</div>
                  <div class="corrected">✅ {{ correction.corrected }}</div>
                  <div class="explanation">💡 {{ correction.explanation }}</div>
                </div>
              </div>
            </div>
            
            <!-- Corrected Version -->
            <div v-if="aiResponse.correctedTanglish" class="corrected-version">
              <div class="corrected-label">📝 Corrected Text:</div>
              <div class="corrected-text">{{ aiResponse.correctedTanglish }}</div>
              <div v-if="aiResponse.correctedTamil" class="corrected-tamil">
                <div class="tamil-label">📖 Tamil:</div>
                <div class="tamil-text">{{ aiResponse.correctedTamil }}</div>
              </div>
            </div>
            
            <!-- Loading State -->
            <div v-if="aiChecking" class="loading-state">
              <div class="loading-dots">
                <span></span><span></span><span></span>
              </div>
              <div>Claude AI is analyzing your text...</div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="aiError" class="ai-error">
            ⚠️ {{ aiError }}
          </div>
        </div>
      </div>
    </div>
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

const { convertWord, convertSentence, getSuggestions, learnCorrection, recordUsage } = useTanglishConverter()
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

// AI Assistant State
const aiHelpEnabled = ref(false)
const aiInputText = ref('')
const aiPlaceholder = ref('Type Tanglish text here for grammar correction...')
const aiResponse = ref(null)

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
const aiPanelPosition = ref({ x: 20, y: 100 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const panelStart = ref({ x: 0, y: 0 })

// AI Panel Style
const aiPanelStyle = computed(() => ({
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  transform: 'none',
  zIndex: 1000
}))

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
    
    // Get surrounding context for better suggestions
    const surroundingContext = state.doc.textBetween(
        Math.max(0, cursorPos - 100), 
        Math.min(state.doc.content.size, cursorPos + 50), 
        ' ', ' '
    )
    
    // Update suggestions AFTER TipTap commits the new character
    setTimeout(() => {
        if (!editor.value) return
        const { state: newState } = editor.value
        const { $from: new$from } = newState.selection
        const newCursorPos = new$from.pos
        const newTextBefore = newState.doc.textBetween(0, newCursorPos, ' ', ' ')
        const newWordObj = getCurrentWord(newTextBefore, newCursorPos)
        const newContext = newState.doc.textBetween(
            Math.max(0, newCursorPos - 100),
            Math.min(newState.doc.content.size, newCursorPos + 50),
            ' ', ' '
        )
        if (newWordObj.word && newWordObj.word.length >= 1) {
            const suggestions = getSuggestions(newWordObj.word, newContext).slice(0, 6)
            suggestionsList.value = suggestions
            if (suggestions.length > 0) {
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
    
    // Auto-convert logic with context ...
    
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
        // Use context-aware conversion
        const converted = convertWord(currentWordObj.word, surroundingContext)
        
        if (converted && converted !== currentWordObj.word) {
            let addSpace = true
            
            if (text === ' ') {
                addSpace = true
            } else if (text === '\n') {
                addSpace = false
            } else {
                addSpace = false
            }
            
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
        selectSuggestion(suggestionsList.value[selectedSuggestionIndex.value])
      }
      return true
      
    case 'Escape':
      showSuggestions.value = false
      suggestionsList.value = []
      return true
      
    case ' ':
      // Do NOT intercept Space — let it fall through to handleTyping which
      // calls convertWord() directly. Picking suggestion[0] here caused wrong
      // outputs like "oruthar" → "ஒருத" (prefix match) instead of "ஒருதர்".
      return false
      
    case 'Backspace':
      setTimeout(() => {
        const { state } = view
        const { selection } = state
        const { $from } = selection
        const textBefore = state.doc.textBetween(0, $from.pos, ' ', ' ')
        const currentWordObj = getCurrentWord(textBefore, $from.pos)
        
        if (currentWordObj.word && currentWordObj.word.length > 0) {
          const suggestions = getSuggestions(currentWordObj.word).slice(0, 6)
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
const selectSuggestion = (suggestion) => {
  if (!editor.value) return
  
  const { state, view } = editor.value
  const { selection } = state
  const { $from } = selection
  const cursorPos = $from.pos
  const textBefore = state.doc.textBetween(0, cursorPos, ' ', ' ')
  const currentWordObj = getCurrentWord(textBefore, cursorPos)
  
  if (currentWordObj.word) {
    replaceWord(view, currentWordObj.start, currentWordObj.end, suggestion.tamil, true)
    learnCorrection(currentWordObj.word, suggestion.tamil)
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

// Convert all text in editor
const convertAll = () => {
  if (!editor.value) return
  const text = editor.value.getText()
  const converted = convertSentence(text)
  
  const html = converted.split('\n').map(para => {
    if (para.trim()) {
      return `<p>${para}</p>`
    }
    return '<p><br></p>'
  }).join('')
  
  editor.value.commands.setContent(html)
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

// ============ AI Assistant Functions ============

// Toggle AI Help ON/OFF
const toggleAIHelp = () => {
  aiHelpEnabled.value = !aiHelpEnabled.value
  if (!aiHelpEnabled.value) {
    // Clear AI response when turning off
    aiResponse.value = null
    aiInputText.value = ''
  }
}

// Check grammar using Claude API
const checkGrammarWithAI = async () => {
  if (!aiInputText.value.trim()) return
  
  aiResponse.value = null
  const result = await checkGrammar(aiInputText.value)
  
  if (result && !aiError.value) {
    aiResponse.value = result
  }
}

// Clear AI input
const clearAIInput = () => {
  aiInputText.value = ''
  aiResponse.value = null
}

// Apply AI correction to editor — inserts at cursor with chosen alignment
const applyAICorrection = () => {
  if (!editor.value || !aiResponse.value?.correctedTanglish) return

  // Insert corrected text at the current cursor position
  editor.value.commands.insertContent(aiResponse.value.correctedTanglish)
  editor.value.commands.focus()
}

// Get type icon and label
const getTypeIcon = (type) => {
  const icons = {
    grammar: '📖',
    tense: '⏰',
    spelling: '🔤',
    word_order: '📐'
  }
  return icons[type] || '📝'
}

const getTypeLabel = (type) => {
  const labels = {
    grammar: 'Grammar',
    tense: 'Tense',
    spelling: 'Spelling',
    word_order: 'Word Order'
  }
  return labels[type] || 'Issue'
}

// Drag functionality for AI panel
const startDrag = (e) => {
  if (e.target.closest('.ai-close')) return
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  panelStart.value = { ...aiPanelPosition.value }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  
  // Get window dimensions
  const maxX = window.innerWidth - 380 // Approximate panel width
  const maxY = window.innerHeight - 500 // Approximate panel height
  
  let newX = panelStart.value.x + deltaX
  let newY = panelStart.value.y + deltaY
  
  // Constrain to window bounds
  newX = Math.max(10, Math.min(newX, maxX))
  newY = Math.max(10, Math.min(newY, maxY))
  
  aiPanelPosition.value = { x: newX, y: newY }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
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

  // Close font dropdown when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (fontSelectorRef.value && !fontSelectorRef.value.contains(e.target)) {
      showFontDropdown.value = false
    }
    if (fontSizeRef.value && !fontSizeRef.value.contains(e.target)) {
      showFontSizeDropdown.value = false
    }
  })

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
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.toolbar-group {
  display: flex;
  gap: 2px;
  align-items: center;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #ddd;
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
  background: transparent;
  color: #444;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.toolbar-btn:hover {
  background: #f0f0f0;
  color: #111;
}

.toolbar-btn.active {
  background: #e8e0ff;
  color: #6c47ff;
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* btn-convert, btn-clear, btn-ai, btn-voice ghost styles are defined below near voice section */

.auto-convert {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  margin-left: 8px;
  padding: 0 8px;
}

.auto-convert input[type="checkbox"] {
  accent-color: #6c47ff;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.toolbar-stats {
  margin-left: auto;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #999;
  font-weight: 500;
}

/* Editor Area */
.editor-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

.editor-content {
  flex: 1;
  padding: 32px 40px;
  font-size: 18px;
  line-height: 1.8;
  overflow-y: auto;
}

.editor-content :deep(.tiptap) {
  outline: none;
  min-height: 100%;
}

.editor-content :deep(p) {
  margin: 0 0 0.8em 0;
}

.editor-content :deep(h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 0 0 0.5em 0;
  color: #1a1a2e;
}

.editor-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  color: #1a1a2e;
}

.editor-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  color: #1a1a2e;
}

.editor-content :deep(blockquote) {
  border-left: 4px solid #6c47ff;
  padding-left: 16px;
  margin: 0.8em 0;
  color: #555;
  font-style: italic;
}

.editor-content :deep(code) {
  background: #f0edff;
  color: #6c47ff;
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
  border-top: 2px solid #eee;
  margin: 1.5em 0;
}

.editor-content :deep(s) {
  text-decoration: line-through;
  color: #999;
}

.editor-content :deep(.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #bbb;
  pointer-events: none;
  height: 0;
  font-style: italic;
}

/* Suggestions Popup */
.suggestions-popup {
  position: absolute;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  min-width: 260px;
  max-width: 320px;
  max-height: 320px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.15s;
  font-size: 14px;
}

.suggestion-item:first-child {
  border-radius: 10px 10px 0 0;
}

.suggestion-item:last-child {
  border-radius: 0 0 10px 10px;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background: #f0edff;
}

.tanglish-text {
  font-family: 'Courier New', monospace;
  color: #888;
  font-size: 12px;
  min-width: 80px;
  font-weight: 500;
}

.arrow {
  color: #6c47ff;
  font-weight: bold;
  font-size: 14px;
}

.tamil-text {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 16px;
  color: #1a1a2e;
  font-weight: 500;
  flex: 1;
}

/* Floating AI Assistant Panel */
.ai-assistant-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: move;
  user-select: none;
}

.ai-icon {
  font-size: 20px;
}

.ai-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.ai-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.ai-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ai-panel-content {
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.ai-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-family: monospace;
  resize: vertical;
  margin-bottom: 12px;
}

.ai-input:focus {
  outline: none;
  border-color: #667eea;
}

.ai-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.ai-check-btn, .ai-clear-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-check-btn {
  flex: 1;
  background: #667eea;
  color: white;
}

.ai-check-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.ai-check-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-clear-btn {
  background: #e0e0e0;
  color: #666;
}

.ai-clear-btn:hover:not(:disabled) {
  background: #ccc;
}

.ai-response {
  margin-top: 12px;
  border-top: 1px solid #e0e0e0;
  padding-top: 12px;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.apply-correction-btn {
  padding: 4px 12px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.apply-correction-btn:hover {
  background: #219a52;
}

.corrections-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.correction-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  border-left: 3px solid;
}

.correction-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  margin-bottom: 6px;
}

.correction-badge.grammar { background: #fef3e2; color: #f39c12; border-left-color: #f39c12; }
.correction-badge.tense { background: #fee; color: #e74c3c; border-left-color: #e74c3c; }
.correction-badge.spelling { background: #e8f4fd; color: #3498db; border-left-color: #3498db; }
.correction-badge.word_order { background: #e8f8f5; color: #1abc9c; border-left-color: #1abc9c; }

.correction-text {
  font-size: 12px;
}

.original, .corrected, .explanation {
  margin: 4px 0;
}

.original { color: #e74c3c; }
.corrected { color: #27ae60; }
.explanation { color: #7f8c8d; font-size: 11px; }

.corrected-version {
  background: #f0f9ff;
  padding: 10px;
  border-radius: 8px;
  margin-top: 10px;
}

.corrected-label, .tamil-label {
  font-weight: 600;
  font-size: 11px;
  color: #2980b9;
  margin-bottom: 4px;
}

.corrected-text {
  font-size: 13px;
  color: #333;
  margin-bottom: 8px;
  word-break: break-word;
}

.tamil-text {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 14px;
  color: #1a1a2e;
}

.loading-state {
  text-align: center;
  padding: 20px;
  color: #666;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.ai-error {
  margin-top: 12px;
  padding: 10px;
  background: #fee;
  color: #e74c3c;
  border-radius: 6px;
  font-size: 12px;
}

.spinner-small {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Scrollbar Styling */
.editor-content::-webkit-scrollbar,
.suggestions-popup::-webkit-scrollbar,
.ai-panel-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.editor-content::-webkit-scrollbar-track,
.suggestions-popup::-webkit-scrollbar-track,
.ai-panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb,
.suggestions-popup::-webkit-scrollbar-thumb,
.ai-panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
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
  min-width: 90px;
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

</style>