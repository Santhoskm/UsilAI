<template>
  <div class="audio-to-text-container">
    <!-- Header -->
    <div class="audio-header">
      <div class="header-icon-badge">🎙️</div>
      <div class="header-titles">
        <h3>Tamil Audio to Text (தமிழ் குரல்வழி உரை)</h3>
        <p class="audio-description">
          Convert spoken Tamil into accurate text in real-time or from audio files, with instant English translation.
        </p>
      </div>
      <div class="badge-engine">
        <span class="engine-indicator active"></span>
        <span>Tamil Engine: ta-IN (India)</span>
      </div>
    </div>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeMode === 'mic' }"
        @click="switchMode('mic')"
      >
        <span class="tab-icon">🎤</span>
        <span>Live Microphone</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeMode === 'file' }"
        @click="switchMode('file')"
      >
        <span class="tab-icon">📁</span>
        <span>Audio File Upload</span>
      </button>
    </div>

    <!-- Main Two-Column Layout -->
    <div class="audio-two-columns">
      <!-- Left Column - Input Controls -->
      <div class="audio-left-panel">
        <!-- Live Microphone Mode -->
        <div v-if="activeMode === 'mic'" class="mic-panel">
          <div class="mic-status-card" :class="{ 'is-recording': isRecording }">
            <div class="record-avatar-wrapper">
              <div class="record-pulse-layer" v-if="isRecording"></div>
              <div class="record-avatar" :class="{ recording: isRecording }">
                <span v-if="!isRecording">🎙️</span>
                <span v-else>🔴</span>
              </div>
            </div>

            <div class="mic-status-info">
              <div class="mic-status-title">
                {{ isRecording ? 'Listening to Tamil Voice...' : 'Microphone Ready' }}
              </div>
              <div class="mic-status-sub">
                <span v-if="isRecording" class="recording-timer">⏱️ {{ formattedRecordingTime }}</span>
                <span v-else>Click "Start Recording" and speak in Tamil</span>
              </div>
            </div>

            <!-- Live Animated Audio Meter -->
            <div class="audio-meter" v-if="isRecording">
              <div 
                v-for="(bar, index) in audioMeterBars" 
                :key="index" 
                class="meter-bar"
                :style="{ height: `${bar}%` }"
              ></div>
            </div>

            <!-- Action Controls -->
            <div class="mic-action-buttons">
              <button 
                v-if="!isRecording"
                @click="startRecording" 
                :disabled="isProcessing"
                class="primary-btn record-start-btn"
              >
                <span>🎙️ Start Tamil Recording</span>
              </button>
              <template v-else>
                <button 
                  @click="stopRecording" 
                  class="danger-btn record-stop-btn"
                >
                  <span>⏹️ Stop Recording</span>
                </button>
                <button 
                  @click="togglePauseRecording" 
                  class="secondary-btn record-pause-btn"
                >
                  <span>{{ isPaused ? '▶️ Resume' : '⏸️ Pause' }}</span>
                </button>
              </template>
            </div>
          </div>

          <!-- Quick Speech Tips -->
          <div class="feature-hints">
            <div class="hint-item">
              <span class="hint-icon">💡</span>
              <span>Speaks naturally in Tamil — punctuation and spaces are formatted automatically.</span>
            </div>
            <div class="hint-item">
              <span class="hint-icon">⚡</span>
              <span>Long pauses will not cut off your session; take your time.</span>
            </div>
          </div>
        </div>

        <!-- Audio File Upload Mode -->
        <div v-else class="file-panel">
          <div 
            class="file-dropzone"
            :class="{ 'drag-over': isDragOver, 'has-file': !!selectedAudioFile }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleAudioDrop"
            @click="triggerAudioInput"
          >
            <input
              ref="audioInput"
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac"
              style="display: none"
              @change="handleAudioSelect"
            />
            
            <div v-if="!selectedAudioFile" class="dropzone-content">
              <div class="dropzone-icon">🎵</div>
              <div class="dropzone-title">Upload Tamil Audio File</div>
              <div class="dropzone-subtitle">Click to browse or drag & drop audio here</div>
              <div class="dropzone-formats">Supports MP3, WAV, M4A, OGG, WebM (up to 25MB)</div>
            </div>

            <div v-else class="selected-audio-preview" @click.stop>
              <div class="audio-file-header">
                <span class="audio-badge-icon">🎶</span>
                <div class="audio-meta">
                  <div class="audio-file-name">{{ selectedAudioFile.name }}</div>
                  <div class="audio-file-size">{{ formatFileSize(selectedAudioFile.size) }}</div>
                </div>
                <button @click="clearAudioFile" class="clear-file-btn" title="Remove file">✕</button>
              </div>

              <!-- HTML5 Audio Player -->
              <audio 
                ref="audioElement" 
                :src="audioObjectUrl" 
                controls 
                class="embedded-player"
              ></audio>
            </div>
          </div>

          <!-- File Transcription Options -->
          <div v-if="selectedAudioFile" class="file-transcribe-actions">
            <!-- Mode 1: Listen & Transcribe Live -->
            <button 
              @click="startPlaybackTranscription" 
              class="primary-btn playback-transcribe-btn"
              :disabled="isRecording || isProcessing"
            >
              <span v-if="!isPlaybackTranscribing">▶️ Play & Transcribe Live via Mic</span>
              <span v-else>⏹️ Stop Live Transcription</span>
            </button>

            <!-- Mode 2: Cloud Whisper Option -->
            <div class="whisper-accordion">
              <div class="whisper-header" @click="showWhisperConfig = !showWhisperConfig">
                <span>🤖 Cloud AI Transcription (Whisper)</span>
                <span class="chevron">{{ showWhisperConfig ? '▲' : '▼' }}</span>
              </div>
              <div v-if="showWhisperConfig" class="whisper-body">
                <p class="whisper-help-text">
                  Direct audio file transcription uses OpenAI or Groq Whisper. Enter an API key below to transcribe in 1 click:
                </p>
                <div class="whisper-key-input-row">
                  <input 
                    v-model="whisperApiKey" 
                    type="password" 
                    placeholder="Enter Groq (free) or OpenAI API key (gsk_... or sk-...)" 
                    class="whisper-input"
                  />
                  <button 
                    @click="runWhisperTranscription" 
                    class="secondary-btn"
                    :disabled="isProcessing || !whisperApiKey.trim()"
                  >
                    Transcribe
                  </button>
                </div>
                <div class="whisper-footnote">
                  Tip: Get a free instant Groq key at <code>console.groq.com/keys</code> (no credit card needed).
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Processing Progress Bar -->
        <div v-if="isProcessing" class="processing-card">
          <div class="spinner"></div>
          <div class="processing-title">{{ processingStatusText }}</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
          </div>
          <div class="progress-percentage">{{ progress }}%</div>
        </div>

        <!-- Error Card -->
        <div v-if="audioError" class="error-banner">
          <span class="error-icon">⚠️</span>
          <div class="error-message-text">{{ audioError }}</div>
          <button @click="audioError = null" class="error-close-btn">✕</button>
        </div>
      </div>

      <!-- Right Column - Results & Editor -->
      <div class="audio-right-panel">
        <div class="results-container">
          <!-- Translation Toggle & Controls -->
          <div class="results-toolbar">
            <div class="output-type-pills">
              <button 
                class="pill-btn" 
                :class="{ active: outputType === 'tamil' }"
                @click="outputType = 'tamil'"
              >
                Tamil Transcript Only
              </button>
              <button 
                class="pill-btn" 
                :class="{ active: outputType === 'both' }"
                @click="outputType = 'both'"
              >
                Tamil + English Translation
              </button>
            </div>

            <div class="toolbar-actions" v-if="tamilTranscript">
              <button 
                @click="triggerTranslation" 
                class="action-pill-btn translate-btn" 
                :disabled="isTranslating"
                title="Translate to English"
              >
                <span v-if="!isTranslating">🌐 Translate</span>
                <span v-else>Translating...</span>
              </button>
              <button 
                @click="clearAllResults" 
                class="action-pill-btn clear-btn"
                title="Clear all"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          <!-- Tamil Transcript Box -->
          <div class="transcript-card" v-if="tamilTranscript || isRecording">
            <div class="transcript-card-header">
              <div class="card-title-group">
                <span class="card-icon">📝</span>
                <span class="card-title">Tamil Transcript (தமிழ் உரை)</span>
                <span class="live-dot" v-if="isRecording" title="Recording live"></span>
              </div>
              
              <div class="card-header-actions">
                <span class="stats-badge">{{ wordCount(tamilTranscript) }} words</span>
                <button 
                  @click="copyText(tamilTranscript, 'Tamil transcript')" 
                  class="icon-btn" 
                  title="Copy Tamil"
                >
                  📋 Copy
                </button>
                <button 
                  @click="insertToEditor(tamilTranscript)" 
                  class="primary-icon-btn" 
                  title="Open in Tanglish Editor"
                >
                  ✨ Open in Editor
                </button>
              </div>
            </div>

            <!-- Editable Transcript Textarea -->
            <div class="transcript-editor-wrapper">
              <textarea 
                v-model="tamilTranscript" 
                class="transcript-textarea tamil-script"
                placeholder="Spoken Tamil will appear here in real time..."
                rows="6"
              ></textarea>
              <div v-if="interimTranscript" class="live-interim-bubble">
                <span class="interim-label">Listening:</span> {{ interimTranscript }}
              </div>
            </div>
          </div>

          <!-- English Translation Box -->
          <div 
            class="transcript-card translation-card" 
            v-if="outputType === 'both' && (englishTranslation || isTranslating)"
          >
            <div class="transcript-card-header">
              <div class="card-title-group">
                <span class="card-icon">🇬🇧</span>
                <span class="card-title">English Translation</span>
              </div>

              <div class="card-header-actions" v-if="englishTranslation">
                <span class="stats-badge">{{ wordCount(englishTranslation) }} words</span>
                <button 
                  @click="copyText(englishTranslation, 'English translation')" 
                  class="icon-btn" 
                  title="Copy English"
                >
                  📋 Copy
                </button>
                <button 
                  @click="insertToEditor(englishTranslation)" 
                  class="primary-icon-btn" 
                  title="Open in Tanglish Editor"
                >
                  ✨ Open in Editor
                </button>
              </div>
            </div>

            <div class="transcript-editor-wrapper">
              <div v-if="isTranslating" class="translation-loader">
                <div class="mini-spinner"></div>
                <span>Translating with Claude AI...</span>
              </div>
              <textarea 
                v-else
                v-model="englishTranslation" 
                class="transcript-textarea english-script"
                placeholder="English translation will appear here..."
                rows="5"
              ></textarea>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!tamilTranscript && !isRecording && !isProcessing" class="empty-state-card">
            <div class="empty-icon-art">🎙️</div>
            <h4>Ready to convert your voice to text</h4>
            <p>
              Click <strong>"Start Tamil Recording"</strong> on the left, or upload an audio file to convert spoken Tamil to text.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const emit = defineEmits(['text-extracted'])
const router = useRouter()

// UI state
const activeMode = ref('mic') // 'mic' | 'file'
const isRecording = ref(false)
const isPaused = ref(false)
const isProcessing = ref(false)
const isTranslating = ref(false)
const isPlaybackTranscribing = ref(false)
const progress = ref(0)
const processingStatusText = ref('')
const audioError = ref(null)
const outputType = ref('both') // 'tamil' | 'both'

// Transcripts
const transcriptAccumulated = ref('')
const interimTranscript = ref('')
const tamilTranscript = ref('')
const englishTranslation = ref('')

// File upload
const selectedAudioFile = ref(null)
const audioObjectUrl = ref('')
const isDragOver = ref(false)
const audioInput = ref(null)
const audioElement = ref(null)

// Cloud Whisper config
const showWhisperConfig = ref(false)
const whisperApiKey = ref(localStorage.getItem('usil_whisper_api_key') || '')

// Live recording duration
const recordingSeconds = ref(0)
let timerInterval = null

// Live Audio Visualizer
const audioMeterBars = ref([20, 40, 60, 80, 50, 30, 70, 90, 45, 25])
let audioContext = null
let analyser = null
let microphoneStream = null
let animationFrameId = null

// Web Speech API
let recognition = null
let userRequestedStop = false

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

const formattedRecordingTime = computed(() => {
  const mins = Math.floor(recordingSeconds.value / 60)
  const secs = recordingSeconds.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const wordCount = (text) => {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

const switchMode = (mode) => {
  if (isRecording.value) {
    stopRecording()
  }
  activeMode.value = mode
  audioError.value = null
}

// -------------------------------------------------------------------------
// Speech Recognition Engine (Web Speech API with ta-IN)
// -------------------------------------------------------------------------
const initSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    audioError.value = 'Web Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.'
    return null
  }

  const rec = new SpeechRecognition()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'ta-IN' // Tamil (India)
  rec.maxAlternatives = 1

  rec.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        const text = result[0].transcript.trim()
        if (text) {
          transcriptAccumulated.value += (transcriptAccumulated.value ? ' ' : '') + text
        }
      } else {
        interim += result[0].transcript
      }
    }

    interimTranscript.value = interim
    // Combine permanently accumulated text with live interim words
    tamilTranscript.value = transcriptAccumulated.value + (interim ? ' ' + interim : '')
  }

  rec.onerror = (event) => {
    // Normal pause events - do not terminate recording
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return
    }

    if (event.error === 'not-allowed') {
      audioError.value = 'Microphone access was blocked. Click the lock icon in your browser address bar → allow Microphone → refresh.'
      stopRecording()
    } else if (event.error === 'network') {
      audioError.value = 'Speech recognition network error. Please check your internet connection.'
      stopRecording()
    } else {
      console.warn('[Speech Recognition]:', event.error)
    }
  }

  rec.onend = () => {
    // If the browser closes recognition after silence or streaming limit, auto-restart while recording is still active
    if (isRecording.value && !userRequestedStop) {
      try {
        rec.start()
      } catch (_) {}
    }
  }

  return rec
}

// Start Live Recording
const startRecording = async () => {
  audioError.value = null
  userRequestedStop = false

  try {
    // 1. Request microphone access for AudioContext visualizer
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    setupAudioVisualizer(microphoneStream)

    // 2. Start Web Speech Recognition
    recognition = initSpeechRecognition()
    if (!recognition) return

    recognition.start()
    isRecording.value = true
    isPaused.value = false

    // 3. Start Timer
    recordingSeconds.value = 0
    clearInterval(timerInterval)
    timerInterval = setInterval(() => {
      if (!isPaused.value) {
        recordingSeconds.value++
      }
    }, 1000)

  } catch (err) {
    console.error('Mic access error:', err)
    audioError.value = 'Could not access your microphone. Please verify permissions in browser settings.'
    stopRecording()
  }
}

// Stop Live Recording
const stopRecording = () => {
  userRequestedStop = true
  isRecording.value = false
  isPaused.value = false
  isPlaybackTranscribing.value = false

  clearInterval(timerInterval)

  // Commit any remaining interim words into permanent text
  if (interimTranscript.value.trim()) {
    transcriptAccumulated.value += (transcriptAccumulated.value ? ' ' : '') + interimTranscript.value.trim()
    tamilTranscript.value = transcriptAccumulated.value
    interimTranscript.value = ''
  }

  // Stop Speech Recognition
  if (recognition) {
    try { recognition.stop() } catch (_) {}
    recognition = null
  }

  // Clean up Audio Visualizer
  cleanupAudioVisualizer()

  // Auto-translate if Tamil text exists and 'both' is selected
  if (outputType.value === 'both' && tamilTranscript.value.trim() && !englishTranslation.value) {
    triggerTranslation()
  }
}

// Toggle Pause
const togglePauseRecording = () => {
  if (isPaused.value) {
    isPaused.value = false
    try { recognition?.start() } catch (_) {}
  } else {
    isPaused.value = true
    try { recognition?.stop() } catch (_) {}
  }
}

// Audio Visualizer via Web Audio API
const setupAudioVisualizer = (stream) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    audioContext = new AudioCtx()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 32

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateBars = () => {
      if (!isRecording.value) return
      analyser.getByteFrequencyData(dataArray)

      // Map audio frequency values to meter bar heights (10% to 100%)
      const bars = []
      const step = Math.max(1, Math.floor(bufferLength / 10))
      for (let i = 0; i < 10; i++) {
        const val = dataArray[i * step] || 0
        bars.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))))
      }
      audioMeterBars.value = bars
      animationFrameId = requestAnimationFrame(updateBars)
    }

    updateBars()
  } catch (err) {
    console.warn('Audio visualizer unsupported:', err)
  }
}

const cleanupAudioVisualizer = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop())
    microphoneStream = null
  }
  if (audioContext && audioContext.state !== 'closed') {
    try { audioContext.close() } catch (_) {}
    audioContext = null
  }
}

// -------------------------------------------------------------------------
// Audio File Upload Handling
// -------------------------------------------------------------------------
const triggerAudioInput = () => {
  audioInput.value?.click()
}

const handleAudioSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) handleSelectedFile(file)
}

const handleAudioDrop = (e) => {
  isDragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) handleSelectedFile(file)
}

const handleSelectedFile = (file) => {
  const maxSize = 25 * 1024 * 1024 // 25MB
  if (file.size > maxSize) {
    audioError.value = 'Audio file size exceeds 25MB. Please choose a smaller file.'
    return
  }

  selectedAudioFile.value = file
  audioError.value = null

  if (audioObjectUrl.value) {
    URL.revokeObjectURL(audioObjectUrl.value)
  }
  audioObjectUrl.value = URL.createObjectURL(file)
}

const clearAudioFile = () => {
  selectedAudioFile.value = null
  if (audioObjectUrl.value) {
    URL.revokeObjectURL(audioObjectUrl.value)
    audioObjectUrl.value = ''
  }
  if (audioInput.value) {
    audioInput.value.value = ''
  }
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// -------------------------------------------------------------------------
// File Transcription Mode 1: Play & Transcribe Live via Mic
// -------------------------------------------------------------------------
const startPlaybackTranscription = () => {
  if (isPlaybackTranscribing.value) {
    stopRecording()
    audioElement.value?.pause()
    isPlaybackTranscribing.value = false
    return
  }

  if (!audioElement.value) return

  // Start Speech Recognition
  startRecording()
  isPlaybackTranscribing.value = true

  // Play audio file
  audioElement.value.currentTime = 0
  audioElement.value.play()

  audioElement.value.onended = () => {
    isPlaybackTranscribing.value = false
    stopRecording()
  }
}

// -------------------------------------------------------------------------
// File Transcription Mode 2: Whisper API (Groq or OpenAI)
// -------------------------------------------------------------------------
const runWhisperTranscription = async () => {
  if (!selectedAudioFile.value) {
    audioError.value = 'Please select an audio file first.'
    return
  }

  const key = whisperApiKey.value.trim()
  if (!key) {
    audioError.value = 'Please enter an OpenAI or Groq API key to transcribe directly.'
    return
  }

  // Persist key in localStorage for convenience
  localStorage.setItem('usil_whisper_api_key', key)

  isProcessing.value = true
  progress.value = 20
  processingStatusText.value = 'Uploading audio to Whisper engine...'
  audioError.value = null

  try {
    const isGroq = key.startsWith('gsk_')
    const endpoint = isGroq 
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions'
    const model = isGroq ? 'whisper-large-v3-turbo' : 'whisper-1'

    const formData = new FormData()
    formData.append('file', selectedAudioFile.value)
    formData.append('model', model)
    formData.append('language', 'ta')
    formData.append('response_format', 'json')

    progress.value = 50
    processingStatusText.value = 'Whisper is transcribing Tamil audio...'

    const res = await axios.post(endpoint, formData, {
      headers: {
        'Authorization': `Bearer ${key}`
      }
    })

    progress.value = 90
    processingStatusText.value = 'Processing Tamil text...'

    const transcribed = res.data?.text || ''
    if (transcribed) {
      transcriptAccumulated.value = transcribed
      tamilTranscript.value = transcribed
      progress.value = 100

      if (outputType.value === 'both') {
        await triggerTranslation()
      }
    } else {
      throw new Error('No speech detected in audio file.')
    }
  } catch (err) {
    console.error('Whisper transcription error:', err)
    audioError.value = err.response?.data?.error?.message || err.message || 'Whisper transcription failed. Please check your API key.'
  } finally {
    isProcessing.value = false
  }
}

// -------------------------------------------------------------------------
// Translation to English using Claude Sonnet
// -------------------------------------------------------------------------
const triggerTranslation = async () => {
  const tamilText = tamilTranscript.value.trim()
  if (!tamilText) return

  if (!CLAUDE_API_KEY) {
    audioError.value = 'Claude API key not configured for English translation.'
    return
  }

  isTranslating.value = true
  audioError.value = null

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: `You are a professional Tamil-to-English translator.
Translate the following spoken Tamil speech transcript accurately and fluently into English.
Maintain natural conversational grammar, preserve proper nouns, and keep all numbers/dates intact.
Output ONLY the English translation without introductory remarks, explanations, or quotes.

Tamil Transcript:
${tamilText}`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      }
    )

    englishTranslation.value = response.data?.content?.[0]?.text?.trim() || ''
  } catch (err) {
    console.error('Translation error:', err)
    // Fallback to Haiku if Sonnet fails
    try {
      const fallbackRes = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: `Translate this Tamil text to English concisely:\n\n${tamilText}`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          }
        }
      )
      englishTranslation.value = fallbackRes.data?.content?.[0]?.text?.trim() || ''
    } catch (fbErr) {
      audioError.value = 'Translation failed: ' + (fbErr.message || 'network error')
    }
  } finally {
    isTranslating.value = false
  }
}

// -------------------------------------------------------------------------
// Clipboard, Tanglish Editor Handover & Reset
// -------------------------------------------------------------------------
const copyText = (text, label) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  alert(`Copied ${label} to clipboard!`)
}

const insertToEditor = (text) => {
  if (!text) return
  sessionStorage.setItem('usil_imported_text', text)
  emit('text-extracted', text)
  router.push('/')
}

const clearAllResults = () => {
  transcriptAccumulated.value = ''
  interimTranscript.value = ''
  tamilTranscript.value = ''
  englishTranslation.value = ''
  audioError.value = null
}

onBeforeUnmount(() => {
  stopRecording()
  if (audioObjectUrl.value) {
    URL.revokeObjectURL(audioObjectUrl.value)
  }
})
</script>

<style scoped>
.audio-to-text-container {
  background: white;
  border-radius: 16px;
  padding: 28px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}

/* Header */
.audio-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #edf2f7;
  flex-wrap: wrap;
}

.header-icon-badge {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.header-titles {
  flex: 1;
  min-width: 250px;
}

.header-titles h3 {
  margin: 0 0 4px 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
}

.audio-description {
  color: #64748b;
  font-size: 13.5px;
  margin: 0;
}

.badge-engine {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.engine-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

/* Mode Switcher Tabs */
.mode-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  background: #f8fafc;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  width: fit-content;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-btn.active {
  background: white;
  color: #4f46e5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Grid Layout */
.audio-two-columns {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 24px;
}

/* Left Panel */
.audio-left-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mic-status-card {
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  transition: all 0.3s;
}

.mic-status-card.is-recording {
  border-color: #ef4444;
  background: #fef2f2;
}

.record-avatar-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
}

.record-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
  border: 3px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  position: relative;
  z-index: 2;
}

.record-avatar.recording {
  border-color: #ef4444;
  background: #fee2e2;
}

.record-pulse-layer {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.3);
  animation: pulse-ring 1.6s infinite ease-out;
  z-index: 1;
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}

.mic-status-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.mic-status-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.recording-timer {
  color: #ef4444;
  font-weight: 700;
  font-size: 14px;
}

/* Audio Meter Waveform */
.audio-meter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 36px;
  width: 100%;
}

.meter-bar {
  width: 6px;
  background: linear-gradient(to top, #ef4444, #f87171);
  border-radius: 3px;
  transition: height 0.08s ease;
}

.mic-action-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.primary-btn {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
}

.danger-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
  transition: all 0.2s;
}

.danger-btn:hover {
  background: #dc2626;
}

.secondary-btn {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 12px 18px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.feature-hints {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

/* File Upload Area */
.file-dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  padding: 28px 20px;
  background: #f8fafc;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-dropzone:hover {
  border-color: #6366f1;
  background: #f5f3ff;
}

.dropzone-icon {
  font-size: 38px;
  margin-bottom: 8px;
}

.dropzone-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.dropzone-subtitle {
  font-size: 12.5px;
  color: #64748b;
  margin-bottom: 8px;
}

.dropzone-formats {
  font-size: 11px;
  color: #94a3b8;
}

.selected-audio-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audio-file-header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.audio-badge-icon {
  font-size: 22px;
}

.audio-meta {
  flex: 1;
  text-align: left;
}

.audio-file-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #1e293b;
  word-break: break-all;
}

.audio-file-size {
  font-size: 11.5px;
  color: #64748b;
}

.clear-file-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.clear-file-btn:hover {
  color: #ef4444;
}

.embedded-player {
  width: 100%;
  height: 40px;
  border-radius: 8px;
}

.file-transcribe-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.playback-transcribe-btn {
  width: 100%;
}

.whisper-accordion {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.whisper-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  user-select: none;
}

.whisper-body {
  padding: 14px 16px;
  border-top: 1px solid #e2e8f0;
  background: white;
}

.whisper-help-text {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.whisper-key-input-row {
  display: flex;
  gap: 8px;
}

.whisper-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 12.5px;
  outline: none;
}

.whisper-footnote {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
}

.whisper-footnote code {
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 4px;
  color: #4f46e5;
}

/* Progress and Errors */
.processing-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-title {
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  margin-bottom: 10px;
}

.progress-bar-container {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #8b5cf6);
  transition: width 0.3s;
}

.progress-percentage {
  font-size: 11.5px;
  color: #64748b;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
}

.error-message-text {
  flex: 1;
}

.error-close-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-weight: bold;
}

/* Right Panel - Results */
.audio-right-panel {
  display: flex;
  flex-direction: column;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.results-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.output-type-pills {
  display: flex;
  gap: 8px;
}

.pill-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.pill-btn.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.action-pill-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.translate-btn {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}

.translate-btn:hover {
  background: #d1fae5;
}

.clear-btn {
  color: #64748b;
}

.clear-btn:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* Transcript Cards */
.transcript-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transcript-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse-ring 1s infinite;
}

.card-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-badge {
  font-size: 11.5px;
  color: #64748b;
  background: #e2e8f0;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.icon-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: white;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #f1f5f9;
}

.primary-icon-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: none;
  background: #4f46e5;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-icon-btn:hover {
  background: #4338ca;
}

.transcript-editor-wrapper {
  position: relative;
}

.transcript-textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: white;
  font-size: 15px;
  line-height: 1.6;
  color: #0f172a;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.transcript-textarea:focus {
  border-color: #6366f1;
}

.transcript-textarea.tamil-script {
  font-family: 'Noto Sans Tamil', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
}

.live-interim-bubble {
  margin-top: 8px;
  padding: 8px 12px;
  background: #e0e7ff;
  border-radius: 8px;
  color: #3730a3;
  font-size: 13.5px;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 6px;
}

.interim-label {
  font-weight: 700;
  font-size: 11.5px;
  text-transform: uppercase;
  color: #4f46e5;
}

.translation-loader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px;
  background: white;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  color: #6366f1;
  font-size: 13.5px;
  font-weight: 600;
  justify-content: center;
}

.mini-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e7ff;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Empty State Card */
.empty-state-card {
  text-align: center;
  padding: 60px 24px;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  margin-top: auto;
  margin-bottom: auto;
}

.empty-icon-art {
  font-size: 48px;
  margin-bottom: 14px;
  opacity: 0.6;
}

.empty-state-card h4 {
  font-size: 17px;
  color: #1e293b;
  margin: 0 0 6px 0;
  font-weight: 700;
}

.empty-state-card p {
  font-size: 13.5px;
  color: #64748b;
  max-width: 420px;
  margin: 0 auto;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 1024px) {
  .audio-two-columns {
    grid-template-columns: 1fr;
  }
}
</style>