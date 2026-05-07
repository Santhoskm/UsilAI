<template>
  <div class="claude-grammar-checker">
    <div class="header">
      <div class="title">
        <span class="icon">🤖</span>
        <h3>AI Grammar Checker (Powered by Claude)</h3>
      </div>
      <div class="status" v-if="isChecking">
        <div class="pulse"></div>
        <span>Claude is analyzing...</span>
      </div>
    </div>

    <!-- Input Section -->
    <div class="input-section">
      <textarea
        v-model="inputText"
        :placeholder="placeholderText"
        class="grammar-input"
        rows="3"
      ></textarea>
      
      <div class="button-group">
        <button 
          @click="checkGrammarText" 
          :disabled="isChecking || !inputText.trim()"
          class="btn btn-primary"
        >
          <span v-if="!isChecking">🔍 Check with Claude</span>
          <span v-else>
            <span class="spinner"></span>
            Analyzing...
          </span>
        </button>
        <button @click="clearAll" class="btn btn-secondary">Clear</button>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="correctionResult" class="results-section">
      <!-- Error Summary -->
      <div v-if="correctionResult.hasErrors" class="error-summary">
        <div class="summary-badge">
          <span class="error-count">{{ correctionResult.corrections.length }}</span>
          <span>issues found</span>
        </div>
        
        <!-- Individual Corrections -->
        <div class="corrections-list">
          <div 
            v-for="(correction, idx) in correctionResult.corrections" 
            :key="idx"
            class="correction-card"
          >
            <div class="correction-type" :class="correction.type">
              {{ getTypeIcon(correction.type) }} {{ getTypeLabel(correction.type) }}
            </div>
            <div class="correction-details">
              <div class="original">
                <span class="label">❌ Before:</span>
                <span class="text">{{ correction.original }}</span>
              </div>
              <div class="corrected">
                <span class="label">✅ After:</span>
                <span class="text corrected-text">{{ correction.corrected }}</span>
              </div>
              <div class="explanation">
                <span class="label">💡 Why:</span>
                <span class="text">{{ correction.explanation }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Suggestions -->
        <div v-if="correctionResult.suggestions.length > 0" class="suggestions">
          <div class="suggestions-title">📚 Learning Tips</div>
          <ul>
            <li v-for="(suggestion, idx) in correctionResult.suggestions" :key="idx">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>
      
      <!-- No Errors -->
      <div v-else class="success-message">
        <span class="success-icon">✅</span>
        <div>
          <strong>Perfect!</strong>
          <p>No grammar issues found in your text.</p>
        </div>
      </div>
      
      <!-- Corrected Version -->
      <div v-if="correctionResult.correctedTanglish" class="corrected-version">
        <div class="version-header">
          <span>📝 Corrected Version</span>
          <div class="action-buttons">
            <button @click="copyText(correctionResult.correctedTanglish)" class="copy-btn">
              📋 Copy Tanglish
            </button>
            <button 
              v-if="correctionResult.correctedTamil" 
              @click="copyText(correctionResult.correctedTamil)" 
              class="copy-btn"
            >
              📋 Copy Tamil
            </button>
            <button @click="applyCorrection" class="apply-btn">
               Apply to Editor
            </button>
          </div>
        </div>
        <div class="version-content">
          <div class="tanglish-version">
            <strong>Tanglish:</strong>
            <code>{{ correctionResult.correctedTanglish }}</code>
          </div>
          <div v-if="correctionResult.correctedTamil" class="tamil-version">
            <strong>Tamil:</strong>
            <span class="tamil-text">{{ correctionResult.correctedTamil }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      <span>⚠️</span>
      <span>{{ error }}</span>
      <button @click="error = null" class="close-error">×</button>
    </div>

    <!-- API Status -->
    <div class="api-status">
      <span class="status-dot" :class="{ active: hasApiKey }"></span>
      <span v-if="hasApiKey">Claude API: Connected</span>
      <span v-else>⚠️ Claude API key not configured</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useClaudeGrammarChecker } from '@/composables/useClaudeGrammarChecker'

const emit = defineEmits(['correction-applied'])

const { isChecking, correctionResult, error, checkGrammar } = useClaudeGrammarChecker()

const inputText = ref('')
const placeholderText = ref('Type Tanglish or Tamil text here... Claude AI will check grammar...')

const hasApiKey = computed(() => {
  return import.meta.env.VITE_CLAUDE_API_KEY && import.meta.env.VITE_CLAUDE_API_KEY.length > 0
})

const checkGrammarText = async () => {
  if (!inputText.value.trim()) return
  await checkGrammar(inputText.value)
}

const applyCorrection = () => {
  if (correctionResult.value?.correctedTanglish) {
    emit('correction-applied', correctionResult.value.correctedTanglish)
  }
}

const clearAll = () => {
  inputText.value = ''
  correctionResult.value = null
  error.value = null
}

const copyText = (text) => {
  navigator.clipboard.writeText(text)
  // You can add a toast notification here
  alert('Copied to clipboard!')
}

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
    tense: 'Tense Error',
    spelling: 'Spelling',
    word_order: 'Word Order'
  }
  return labels[type] || 'Issue'
}
</script>

<style scoped>
.claude-grammar-checker {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin: 20px;
  color: white;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title .icon {
  font-size: 28px;
}

.title h3 {
  margin: 0;
  font-size: 18px;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.pulse {
  width: 10px;
  height: 10px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.input-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.grammar-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
  resize: vertical;
}

.grammar-input:focus {
  outline: none;
  border-color: #667eea;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e0e0e0;
  color: #666;
}

.btn-secondary:hover {
  background: #ccc;
}

.results-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  color: #333;
  max-height: 500px;
  overflow-y: auto;
}

.error-summary {
  margin-bottom: 20px;
}

.summary-badge {
  background: #fee;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.error-count {
  font-size: 20px;
  font-weight: bold;
  color: #e74c3c;
}

.corrections-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.correction-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.correction-type {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.correction-type.grammar { background: #fef3e2; color: #f39c12; }
.correction-type.tense { background: #fee; color: #e74c3c; }
.correction-type.spelling { background: #e8f4fd; color: #3498db; }
.correction-type.word_order { background: #e8f8f5; color: #1abc9c; }

.correction-details {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.original, .corrected, .explanation {
  font-size: 13px;
  line-height: 1.5;
}

.label {
  font-weight: 600;
  color: #666;
  margin-right: 8px;
}

.corrected-text {
  color: #00b894;
  font-weight: 500;
}

.suggestions {
  background: #f0f9ff;
  padding: 16px;
  border-radius: 10px;
  margin-top: 16px;
}

.suggestions-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #2980b9;
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.suggestions li {
  font-size: 13px;
  margin: 4px 0;
  color: #555;
}

.success-message {
  background: #e8f8f5;
  padding: 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.success-icon {
  font-size: 32px;
}

.success-message p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

.corrected-version {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e0e0e0;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.copy-btn, .apply-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn {
  background: #e0e0e0;
  color: #666;
}

.copy-btn:hover {
  background: #ccc;
}

.apply-btn {
  background: #667eea;
  color: white;
}

.apply-btn:hover {
  background: #5a67d8;
}

.version-content {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
}

.tanglish-version, .tamil-version {
  margin: 8px 0;
}

.tanglish-version code {
  background: #e0e0e0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.tamil-text {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 16px;
  color: #1a1a2e;
}

.error-message {
  margin-top: 16px;
  background: #fee;
  color: #e74c3c;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.close-error {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #e74c3c;
}

.api-status {
  margin-top: 16px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.1);
  padding: 6px 12px;
  border-radius: 20px;
  width: fit-content;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.active {
  background: #4ade80;
  animation: pulse 2s infinite;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>