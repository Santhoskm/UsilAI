<!-- File: src/components/TamilSubtitleGenerator.vue -->
<template>
  <div class="subtitle-generator">
    <div class="generator-header">
      <h2> Tamil Subtitle Generator</h2>
      <p class="description">AI Subtitle உருவாக்கி — Create professional Tamil subtitles with AI grammar check</p>
    </div>

    <div class="two-columns">
      <!-- Left Column - Input Section -->
      <div class="input-column">
        <div class="input-section">
          <!-- Basic Info -->
          <div class="form-group">
            <label> Title / Show Name</label>
            <input
              v-model="title"
              type="text"
              placeholder="e.g., My Video, Tamil Speech, Documentary..."
              class="title-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label> Start Time (seconds)</label>
              <input
                v-model.number="startTime"
                type="number"
                min="0"
                step="0.1"
                class="time-input"
              />
            </div>
            <div class="form-group">
              <label> End Time (seconds)</label>
              <input
                v-model.number="endTime"
                type="number"
                min="0"
                step="0.1"
                class="time-input"
              />
            </div>
            <div class="form-group">
              <label> Duration (sec)</label>
              <input
                :value="duration.toFixed(1)"
                type="text"
                disabled
                class="time-input readonly"
              />
            </div>
          </div>

          <!-- Subtitle Content -->
          <div class="form-group">
            <label> Tamil Subtitle Content</label>
            <textarea
              v-model="subtitleContent"
              placeholder="Enter your Tamil subtitle text here...
              
Example:
வணக்கம், எப்படி இருக்கீங்க?
இன்று நாம் தமிழ் பற்றி பேசப்போகிறோம்.
தமிழ் உலகின் பழமையான மொழிகளில் ஒன்றாகும்.

Or paste multiple lines - each line will become a separate subtitle cue."
              class="content-input"
              rows="6"
            ></textarea>
          </div>

          <!-- Subtitle Settings -->
          <div class="settings-section">
            <div class="settings-header">
              <span> Subtitle Settings</span>
            </div>
            <div class="settings-grid">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.autoBreak" />
                Auto-break long lines (max 42 chars)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.addPeriods" />
                Add periods to end of sentences
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.capitalizeFirst" />
                Capitalize first letter
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.tamilScript" />
                Ensure Tamil script only
              </label>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button 
              @click="runGrammarCheck" 
              :disabled="isChecking || !subtitleContent.trim()"
              class="btn btn-ai"
            >
              <span v-if="!isChecking"> AI Grammar Check</span>
              <span v-else>
                <span class="spinner-small"></span>
                Checking...
              </span>
            </button>
            <button 
              @click="generateSubtitles" 
              :disabled="isGenerating || !subtitleContent.trim()"
              class="btn btn-generate"
            >
              <span v-if="!isGenerating"> Generate Subtitles</span>
              <span v-else>
                <span class="spinner-small"></span>
                Generating...
              </span>
            </button>
            <button @click="clearAll" class="btn btn-clear">Clear All</button>
          </div>

          <!-- Progress -->
          <div v-if="isGenerating" class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="progress-text">{{ progressMessage }}</div>
          </div>

          <!-- Grammar Suggestions -->
          <div v-if="grammarSuggestions.length > 0" class="grammar-suggestions">
            <div class="suggestions-header">
              <span> AI Grammar Suggestions</span>
              <button @click="applyAllSuggestions" class="apply-all-btn">Apply All</button>
            </div>
            <div class="suggestions-list">
              <div v-for="(suggestion, idx) in grammarSuggestions" :key="idx" class="suggestion-item">
                <div class="suggestion-original">❌ {{ suggestion.original }}</div>
                <div class="suggestion-corrected">✅ {{ suggestion.corrected }}</div>
                <div class="suggestion-explanation">💡 {{ suggestion.explanation }}</div>
                <button @click="applySuggestion(idx)" class="apply-suggestion-btn">Apply</button>
              </div>
            </div>
          </div>

          <!-- API Status -->
          <div class="api-status" v-if="!hasApiKey">
            <span class="status-warning">⚠️</span>
            <span>Claude API key not configured. Grammar check will use basic rules only.</span>
          </div>
        </div>
      </div>

      <!-- Right Column - Output Section -->
      <div class="output-column">
        <div class="output-header">
          <div class="output-tabs">
            <button
              @click="activeTab = 'preview'"
              :class="{ active: activeTab === 'preview' }"
              class="tab-btn"
            >
               Preview
            </button>
            <button
              @click="activeTab = 'srt'"
              :class="{ active: activeTab === 'srt' }"
              class="tab-btn"
            >
              SRT 
            </button>
            <button
              @click="activeTab = 'vtt'"
              :class="{ active: activeTab === 'vtt' }"
              class="tab-btn"
            >
              VTT 
            </button>
            <button
              @click="activeTab = 'ass'"
              :class="{ active: activeTab === 'ass' }"
              class="tab-btn"
            >
              ASS 
            </button>
          </div>
          <div class="output-actions" v-if="generatedSubtitles.length > 0">
            <button @click="copyToClipboard(getCurrentFormat())" class="copy-btn">
               Copy
            </button>
            
            <!-- Single Download Dropdown -->
            <div class="dropdown">
              <button @click="toggleDropdown" class="download-dropdown-btn">
                 Download
                <span class="dropdown-arrow" :class="{ open: isDropdownOpen }">▼</span>
              </button>
              <div v-if="isDropdownOpen" class="dropdown-menu">
                <button @click="downloadSRT" class="dropdown-item">
                  <span class="dropdown-icon"></span>
                  SRT 
                  <span class="dropdown-hint">.srt</span>
                </button>
                <button @click="downloadVTT" class="dropdown-item">
                  <span class="dropdown-icon"></span>
                  VTT 
                  <span class="dropdown-hint">.vtt</span>
                </button>
                <button @click="downloadASS" class="dropdown-item">
                  <span class="dropdown-icon"></span>
                  ASS 
                  <span class="dropdown-hint">.ass</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="output-content">
          <!-- Preview Tab -->
          <div v-if="activeTab === 'preview'" class="preview-content">
            <div v-if="generatedSubtitles.length === 0 && !isGenerating" class="empty-state">
              <div class="empty-icon"></div>
              <p>Enter subtitle content and click "Generate Subtitles"</p>
              <small>AI will create professional subtitle files for you</small>
            </div>
            <div v-else-if="isGenerating" class="loading-state">
              <div class="loading-spinner"></div>
              <p>Creating your subtitles...</p>
            </div>
            <div v-else class="preview-list">
              <div v-for="(sub, idx) in generatedSubtitles" :key="idx" class="preview-item">
                <div class="preview-number">{{ idx + 1 }}</div>
                <div class="preview-time">{{ formatTimeForPreview(sub.start) }} → {{ formatTimeForPreview(sub.end) }}</div>
                <div class="preview-text tamil-text">{{ sub.text }}</div>
              </div>
            </div>
          </div>

          <!-- SRT Tab -->
          <div v-if="activeTab === 'srt'" class="format-content">
            <pre v-if="srtContent" class="code-block">{{ srtContent }}</pre>
            <div v-else class="empty-state">
              <p>Generate subtitles to see SRT format</p>
            </div>
          </div>

          <!-- VTT Tab -->
          <div v-if="activeTab === 'vtt'" class="format-content">
            <pre v-if="vttContent" class="code-block">{{ vttContent }}</pre>
            <div v-else class="empty-state">
              <p>Generate subtitles to see VTT format</p>
            </div>
          </div>

          <!-- ASS Tab -->
          <div v-if="activeTab === 'ass'" class="format-content">
            <pre v-if="assContent" class="code-block">{{ assContent }}</pre>
            <div v-else class="empty-state">
              <p>Generate subtitles to see ASS format</p>
            </div>
          </div>
        </div>

        <!-- Subtitle Statistics -->
        <div v-if="generatedSubtitles.length > 0" class="subtitle-stats">
          <div class="stat-item">
            <span class="stat-value">{{ generatedSubtitles.length }}</span>
            <span class="stat-label">Total Cues</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ totalDuration.toFixed(1) }}s</span>
            <span class="stat-label">Total Duration</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ avgCharsPerCue }}</span>
            <span class="stat-label">Avg chars/cue</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tips Section -->
    <div class="tips-section">
      <h4>💡 Tips for better subtitles:</h4>
      <ul>
        <li>Keep each subtitle line to 42 characters or less for better readability</li>
        <li>Each new line in the content area becomes a separate subtitle cue</li>
        <li>Use AI Grammar Check to fix Tamil language errors before generating</li>
        <li>Subtitles are automatically timed with equal duration between cues</li>
        <li>Download in SRT (most compatible), VTT (web), or ASS (advanced styling)</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

const emit = defineEmits(['subtitles-generated'])

// State
const title = ref('Tamil Subtitles')
const startTime = ref(0)
const endTime = ref(60)
const subtitleContent = ref('')
const isGenerating = ref(false)
const isChecking = ref(false)
const progress = ref(0)
const progressMessage = ref('')
const generatedSubtitles = ref([])
const grammarSuggestions = ref([])
const activeTab = ref('preview')
const aiError = ref(null)
const isDropdownOpen = ref(false)

// Settings
const settings = ref({
  autoBreak: true,
  addPeriods: false,
  capitalizeFirst: false,
  tamilScript: true
})

// Check if API key is configured
const hasApiKey = computed(() => {
  return import.meta.env.VITE_CLAUDE_API_KEY && import.meta.env.VITE_CLAUDE_API_KEY.length > 0
})

// Computed
const duration = computed(() => {
  return Math.max(0, endTime.value - startTime.value)
})

const totalDuration = computed(() => {
  if (generatedSubtitles.value.length === 0) return 0
  const last = generatedSubtitles.value[generatedSubtitles.value.length - 1]
  return last.end - generatedSubtitles.value[0].start
})

const avgCharsPerCue = computed(() => {
  if (generatedSubtitles.value.length === 0) return 0
  const totalChars = generatedSubtitles.value.reduce((sum, cue) => sum + cue.text.length, 0)
  return Math.round(totalChars / generatedSubtitles.value.length)
})

const srtContent = computed(() => {
  if (generatedSubtitles.value.length === 0) return ''
  return formatSRT(generatedSubtitles.value)
})

const vttContent = computed(() => {
  if (generatedSubtitles.value.length === 0) return ''
  return formatVTT(generatedSubtitles.value)
})

const assContent = computed(() => {
  if (generatedSubtitles.value.length === 0) return ''
  return formatASS(generatedSubtitles.value, title.value)
})

// Helper Functions
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`
}

const formatTimeForVTT = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}

const formatTimeForASS = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const centis = Math.floor((seconds % 1) * 100)
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`
}

const formatTimeForPreview = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatSRT = (subtitles) => {
  return subtitles.map((sub, idx) => {
    return `${idx + 1}\n${formatTime(sub.start)} --> ${formatTime(sub.end)}\n${sub.text}\n`
  }).join('\n')
}

const formatVTT = (subtitles) => {
  const header = 'WEBVTT\n\n'
  const body = subtitles.map((sub, idx) => {
    return `${formatTimeForVTT(sub.start)} --> ${formatTimeForVTT(sub.end)}\n${sub.text}\n`
  }).join('\n')
  return header + body
}

const formatASS = (subtitles, titleText) => {
  const header = `[Script Info]
Title: ${titleText}
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Tamil MN,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,1,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const body = subtitles.map((sub) => {
    return `Dialogue: 0,${formatTimeForASS(sub.start)},${formatTimeForASS(sub.end)},Default,,0,0,0,,${sub.text}`
  }).join('\n')
  
  return header + body
}

const cleanText = (text) => {
  let cleaned = text.trim()
  
  if (settings.value.capitalizeFirst && cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  
  if (settings.value.addPeriods && !cleaned.match(/[.!?]$/)) {
    cleaned += '.'
  }
  
  if (settings.value.autoBreak && cleaned.length > 42) {
    const words = cleaned.split(' ')
    let lines = []
    let currentLine = ''
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= 42) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)
    cleaned = lines.join('\n')
  }
  
  if (settings.value.tamilScript) {
    cleaned = cleaned.replace(/[a-zA-Z0-9]/g, '')
  }
  
  return cleaned
}

const parseContentToLines = (content) => {
  let lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  lines = lines.map(line => cleanText(line))
  return lines
}

const generateSubtitles = async () => {
  if (!subtitleContent.value.trim()) return
  
  isGenerating.value = true
  progress.value = 0
  progressMessage.value = 'Parsing content...'
  
  try {
    const lines = parseContentToLines(subtitleContent.value)
    const cueDuration = duration.value / lines.length
    const subtitles = []
    
    for (let i = 0; i < lines.length; i++) {
      progress.value = Math.round(((i + 1) / lines.length) * 100)
      progressMessage.value = `Creating subtitle ${i + 1} of ${lines.length}...`
      
      const cueStart = startTime.value + (i * cueDuration)
      const cueEnd = i === lines.length - 1 ? endTime.value : startTime.value + ((i + 1) * cueDuration)
      
      subtitles.push({
        start: cueStart,
        end: cueEnd,
        text: lines[i]
      })
    }
    
    generatedSubtitles.value = subtitles
    progress.value = 100
    progressMessage.value = 'Complete!'
    
    emit('subtitles-generated', {
      subtitles: generatedSubtitles.value,
      srt: srtContent.value,
      vtt: vttContent.value,
      ass: assContent.value
    })
    
    setTimeout(() => {
      progress.value = 0
      isGenerating.value = false
    }, 500)
    
  } catch (error) {
    console.error('Generation error:', error)
    progressMessage.value = `Error: ${error.message}`
    setTimeout(() => {
      isGenerating.value = false
      progress.value = 0
    }, 2000)
  }
}

// AI Grammar Check using Claude API
const runGrammarCheck = async () => {
  if (!subtitleContent.value.trim()) return
  
  grammarSuggestions.value = []
  isChecking.value = true
  aiError.value = null
  
  try {
    const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
    
    if (!API_KEY) {
      performBasicGrammarCheck()
      return
    }
    
    const prompt = `You are a Tamil language grammar expert. Analyze the following Tamil text and correct any grammatical errors.

Text to check: "${subtitleContent.value}"

Rules to check:
1. Verb conjugations
2. Word order
3. Tense consistency
4. Respectful forms (neenga vs nee)
5. Question formation
6. Common Tamil grammar mistakes

Respond ONLY with valid JSON in this exact format:

{
    "hasErrors": true,
    "corrections": [
        {
            "original": "original text segment",
            "corrected": "corrected text segment",
            "explanation": "brief explanation of the error",
            "type": "grammar"
        }
    ]
}

If no errors found, return:
{
    "hasErrors": false,
    "corrections": []
}`

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      timeout: 30000
    })

    const claudeResponse = response.data.content[0].text
    const parsed = parseAIResponse(claudeResponse)
    
    if (parsed && parsed.corrections && parsed.corrections.length > 0) {
      grammarSuggestions.value = parsed.corrections
    } else if (parsed && !parsed.hasErrors) {
      alert('No grammar issues found! Your Tamil text looks good.')
    }
    
  } catch (error) {
    console.error('AI Grammar check error:', error)
    aiError.value = error.message
    performBasicGrammarCheck()
  } finally {
    isChecking.value = false
  }
}

// Basic grammar check fallback (without AI)
const performBasicGrammarCheck = () => {
  const text = subtitleContent.value
  const suggestions = []
  
  const patterns = [
    {
      pattern: /irukeenga/gi,
      corrected: 'இருக்கீங்க',
      explanation: 'Correct form of "are you" in respectful Tamil'
    },
    {
      pattern: /irukenga/gi,
      corrected: 'இருக்கீங்க',
      explanation: 'Correct form of "are you" in respectful Tamil'
    },
    {
      pattern: /pooren/gi,
      corrected: 'போறேன்',
      explanation: 'Correct form of "I will go"'
    },
    {
      pattern: /varen/gi,
      corrected: 'வரேன்',
      explanation: 'Correct form of "I will come"'
    },
    {
      pattern: /poren/gi,
      corrected: 'போறேன்',
      explanation: 'Correct form of "I will go"'
    }
  ]
  
  for (const pattern of patterns) {
    if (pattern.pattern.test(text)) {
      suggestions.push({
        original: text.match(pattern.pattern)?.[0] || '',
        corrected: pattern.corrected,
        explanation: pattern.explanation,
        type: 'grammar'
      })
    }
  }
  
  if (suggestions.length > 0) {
    grammarSuggestions.value = suggestions
  } else {
    alert('No obvious grammar issues found. For advanced checks, please configure Claude API key.')
  }
}

const parseAIResponse = (response) => {
  try {
    let jsonStr = response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
      return JSON.parse(jsonStr)
    }
    return null
  } catch (e) {
    console.error('Parse error:', e)
    return null
  }
}

const applySuggestion = (index) => {
  const suggestion = grammarSuggestions.value[index]
  if (suggestion && suggestion.corrected) {
    let newContent = subtitleContent.value
    newContent = newContent.replace(suggestion.original, suggestion.corrected)
    subtitleContent.value = newContent
    grammarSuggestions.value.splice(index, 1)
  }
}

const applyAllSuggestions = () => {
  let newContent = subtitleContent.value
  grammarSuggestions.value.forEach(suggestion => {
    newContent = newContent.replace(suggestion.original, suggestion.corrected)
  })
  subtitleContent.value = newContent
  grammarSuggestions.value = []
}

const getCurrentFormat = () => {
  switch (activeTab.value) {
    case 'srt': return srtContent.value
    case 'vtt': return vttContent.value
    case 'ass': return assContent.value
    default: return srtContent.value
  }
}

const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const closeDropdown = () => {
  isDropdownOpen.value = false
}

const downloadSRT = () => {
  if (!srtContent.value) return
  const blob = new Blob([srtContent.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.value.replace(/[^a-z0-9]/gi, '_')}_subtitles.srt`
  a.click()
  URL.revokeObjectURL(url)
  closeDropdown()
}

const downloadVTT = () => {
  if (!vttContent.value) return
  const blob = new Blob([vttContent.value], { type: 'text/vtt' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.value.replace(/[^a-z0-9]/gi, '_')}_subtitles.vtt`
  a.click()
  URL.revokeObjectURL(url)
  closeDropdown()
}

const downloadASS = () => {
  if (!assContent.value) return
  const blob = new Blob([assContent.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.value.replace(/[^a-z0-9]/gi, '_')}_subtitles.ass`
  a.click()
  URL.revokeObjectURL(url)
  closeDropdown()
}

const clearAll = () => {
  subtitleContent.value = ''
  generatedSubtitles.value = []
  grammarSuggestions.value = []
  startTime.value = 0
  endTime.value = 60
  title.value = 'Tamil Subtitles'
  activeTab.value = 'preview'
  closeDropdown()
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.dropdown')
  if (dropdown && !dropdown.contains(event.target)) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch for content changes to clear generated subtitles
watch(subtitleContent, () => {
  if (generatedSubtitles.value.length > 0) {
    generatedSubtitles.value = []
  }
})
</script>

<style scoped>
.subtitle-generator {
  background: var(--card-bg, #ffffff);
  border-radius: 20px;
  padding: 28px;
  border: 1px solid var(--card-border, #e2e8f0);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.generator-header {
  text-align: center;
  margin-bottom: 32px;
}

.generator-header h2 {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-main, #1a1a2e);
  margin-bottom: 8px;
}

.generator-header .description {
  color: var(--text-sub, #666);
  font-size: 14px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Left Column */
.input-column {
  background: var(--card-inner-bg, #f8f9fa);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 16px;
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: var(--text-main, #333);
  margin-bottom: 8px;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.title-input, .time-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--input-border, #e0e0e0);
  border-radius: 8px;
  font-size: 14px;
  background: var(--input-bg, white);
  color: var(--text-main, #0f172a);
  box-sizing: border-box;
  transition: all 0.2s;
}

.title-input:focus, .time-input:focus, .content-input:focus {
  outline: none;
  border-color: #ec4899;
  box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.2);
}

.time-input.readonly {
  background: var(--card-inner-border, #e9ecef);
  color: var(--text-muted, #666);
}

.content-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--input-border, #e0e0e0);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  background: var(--input-bg, white);
  color: var(--text-main, #0f172a);
  resize: vertical;
  box-sizing: border-box;
}

.settings-section {
  background: var(--card-bg, white);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--card-inner-border, #e0e0e0);
}

.settings-header {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-main, #333);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-sub, #555);
  cursor: pointer;
}

.checkbox-label input {
  accent-color: #ec4899;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ai {
  background: linear-gradient(135deg, #e67e22, #d35400);
  color: white;
}

.btn-ai:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(230, 126, 34, 0.4);
}

.btn-generate {
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: white;
}

.btn-generate:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
}

.btn-clear {
  background: var(--card-bg, white);
  border: 1px solid var(--card-inner-border, #cbd5e1);
  color: var(--text-muted, #666);
}

.btn-clear:hover {
  background: var(--toolbar-btn-hover, #ccc);
  color: var(--text-main);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-section {
  margin-top: 16px;
}

.progress-bar {
  height: 6px;
  background: var(--card-inner-border, #e0e0e0);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: var(--text-muted, #666);
  margin-top: 8px;
  text-align: center;
}

.grammar-suggestions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--card-inner-border, #e0e0e0);
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #f59e0b;
}

.apply-all-btn {
  padding: 4px 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}

.suggestions-list {
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  background: var(--card-bg, white);
  border: 1px solid var(--card-inner-border, #e0e0e0);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  position: relative;
}

.suggestion-original {
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 4px;
}

.suggestion-corrected {
  color: #10b981;
  font-size: 13px;
  margin-bottom: 4px;
}

.suggestion-explanation {
  color: var(--text-muted, #7f8c8d);
  font-size: 11px;
  margin-bottom: 8px;
}

.apply-suggestion-btn {
  padding: 4px 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}

.api-status {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 8px;
  font-size: 12px;
  color: #d97706;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-warning {
  font-size: 14px;
}

/* Right Column */
.output-column {
  background: var(--card-inner-bg, #f8f9fa);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.output-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid var(--card-inner-border, #e2e8f0);
  background: var(--card-bg, white);
  color: var(--text-sub, #64748b);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-main, #1e293b);
}

.tab-btn.active {
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  border-color: #ec4899;
  color: white;
}

.output-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.copy-btn {
  padding: 8px 16px;
  border: 1px solid var(--card-inner-border, #ddd);
  background: var(--card-bg, white);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  color: var(--text-main, #333);
}

.copy-btn:hover {
  background: var(--toolbar-btn-hover, #f5f5f5);
}

/* Dropdown Styles */
.dropdown {
  position: relative;
  display: inline-block;
}

.download-dropdown-btn {
  padding: 8px 16px;
  border: 1px solid var(--card-inner-border, #ddd);
  background: var(--card-bg, white);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  color: var(--text-main, #333);
  display: flex;
  align-items: center;
  gap: 6px;
}

.download-dropdown-btn:hover {
  background: var(--toolbar-btn-hover, #f5f5f5);
}

.dropdown-arrow {
  font-size: 10px;
  transition: transform 0.2s;
  color: var(--text-muted, #888);
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--card-bg, white);
  border: 1px solid var(--card-inner-border, #e0e0e0);
  border-radius: 10px;
  min-width: 160px;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: var(--card-bg, white);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-main, #333);
  text-align: left;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--toolbar-btn-hover, #f5f5f5);
}

.dropdown-icon {
  font-size: 14px;
  width: 20px;
}

.dropdown-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted, #999);
  font-family: monospace;
}

.output-content {
  flex: 1;
  background: var(--card-bg, white);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 12px;
  padding: 20px;
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--card-inner-bg, #f8f9fa);
  border-radius: 8px;
  border-left: 3px solid #ec4899;
}

.preview-number {
  font-weight: bold;
  color: #ec4899;
  min-width: 30px;
}

.preview-time {
  font-size: 12px;
  color: var(--text-muted, #888);
  min-width: 100px;
  font-family: monospace;
}

.preview-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-main);
}

.tamil-text {
  font-family: 'Noto Sans Tamil', sans-serif;
}

.code-block {
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #0f172a;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  margin: 0;
  overflow-x: auto;
}

.empty-state, .loading-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  color: var(--text-sub, #999);
  margin-bottom: 8px;
}

.empty-state small {
  color: var(--text-muted, #bbb);
  font-size: 12px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(236, 72, 153, 0.2);
  border-top-color: #ec4899;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

.subtitle-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--card-inner-border, #e0e0e0);
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #ec4899;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted, #888);
}

.tips-section {
  margin-top: 24px;
  padding: 16px;
  background: var(--card-inner-bg, #f8f9fa);
  border-radius: 10px;
  border: 1px solid var(--card-inner-border, #e0e0e0);
}

.tips-section h4 {
  margin: 0 0 10px 0;
  color: var(--text-main, #666);
  font-size: 13px;
}

.tips-section ul {
  margin: 0;
  padding-left: 20px;
}

.tips-section li {
  color: var(--text-muted, #888);
  font-size: 12px;
  margin: 4px 0;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .two-columns {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .output-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .output-tabs {
    justify-content: center;
  }
  
  .output-actions {
    justify-content: center;
  }
  
  .dropdown-menu {
    right: auto;
    left: 0;
  }
}
</style>