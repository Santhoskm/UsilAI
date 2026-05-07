<template>
  <div class="audio-to-text">
    <div class="audio-header">
      <h3> Tamil Audio to Text (Speech Recognition)</h3>
      <p class="audio-description">
        Record or upload Tamil audio to convert to text with English translation
      </p>
    </div>

    <div class="audio-two-columns">
      <!-- Left Column - Audio Upload & Recording -->
      <div class="audio-left">
        <div class="audio-input-section">
          <!-- Recording Section -->
          <div class="recording-section">
            <div class="record-buttons">
              <button 
                @click="startRecording" 
                :disabled="isRecording || isProcessing"
                class="record-btn"
                :class="{ recording: isRecording }"
              >
                <span v-if="!isRecording">🎙️ Start Recording</span>
                <span v-else>
                  <span class="pulse-ring"></span>
                  Recording... Click Stop
                </span>
              </button>
              <button 
                v-if="isRecording"
                @click="stopRecording"
                class="stop-btn"
              >
                ⏹️ Stop
              </button>
            </div>
            
            <div v-if="isRecording" class="recording-indicator">
              <div class="waveform">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <span>Recording in progress...</span>
            </div>
          </div>

          <!-- File Upload Section -->
          <div class="upload-section">
            <div 
              class="upload-area"
              :class="{ 'drag-over': isDragOver }"
              @dragover.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
              @drop.prevent="handleAudioDrop"
              @click="triggerAudioInput"
            >
              <input
                ref="audioInput"
                type="file"
                accept="audio/*"
                style="display: none"
                @change="handleAudioSelect"
              />
              <div class="upload-icon"></div>
              <div class="upload-text">
                Click or drag & drop audio file
              </div>
              <div class="upload-hint">
                Supports MP3, WAV, M4A, OGG (max 20MB)
              </div>
            </div>
          </div>

          <!-- Selected File Info -->
          <div v-if="selectedAudioFile" class="selected-file">
            <span class="file-icon">🎵</span>
            <span class="file-name">{{ selectedAudioFile.name }}</span>
            <span class="file-size">{{ formatFileSize(selectedAudioFile.size) }}</span>
            <button @click="clearAudioFile" class="remove-file-btn">✕</button>
          </div>

          <!-- Processing Status -->
          <div v-if="isProcessing" class="processing-status">
            <div class="spinner"></div>
            <div class="processing-text">Processing audio...</div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="progress-text">{{ progress }}%</div>
          </div>
        </div>
      </div>

      <!-- Right Column - Results -->
      <div class="audio-right">
        <div class="results-section">
          <!-- Language Selection -->
          <div class="language-selector">
            <label class="radio-label">
              <input type="radio" v-model="outputType" value="tamil" />
              <span> Tamil Transcript Only</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="outputType" value="both" />
              <span> Tamil + English Translation</span>
            </label>
          </div>

          <!-- Tamil Transcript -->
          <div class="result-box" v-if="tamilTranscript">
            <div class="result-header">
              <span class="result-icon">📝</span>
              <span class="result-title">Tamil Transcript</span>
              <button @click="copyToClipboard(tamilTranscript)" class="copy-btn">📋 Copy</button>
              <button @click="insertToEditor(tamilTranscript)" class="insert-btn">✨ Insert to Editor</button>
            </div>
            <div class="result-content tamil-text">
              {{ tamilTranscript }}
            </div>
          </div>

          <!-- English Translation -->
          <div class="result-box" v-if="englishTranslation && outputType === 'both'">
            <div class="result-header">
              <span class="result-icon">🇬🇧</span>
              <span class="result-title">English Translation</span>
              <button @click="copyToClipboard(englishTranslation)" class="copy-btn"> Copy</button>
              <button @click="insertToEditor(englishTranslation)" class="insert-btn"> Insert to Editor</button>
            </div>
            <div class="result-content">
              {{ englishTranslation }}
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!tamilTranscript && !isProcessing && !audioError" class="empty-state">
            <div class="empty-icon"></div>
            <div class="empty-text">
              Upload or record Tamil audio to see transcript here
            </div>
            <div class="empty-hint">
              Supported formats: MP3, WAV, M4A, OGG
            </div>
          </div>

          <!-- Error Display -->
          <div v-if="audioError" class="error-message">
            ⚠️ {{ audioError }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tips -->
    <div class="audio-tips">
      <h4> Tips for better accuracy:</h4>
      <ul>
        <li>Speak clearly and at a moderate pace</li>
        <li>Minimize background noise</li>
        <li>Use a good quality microphone</li>
        <li>For better translation quality, speak in complete sentences</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'

const emit = defineEmits(['text-extracted'])

// State
const isRecording = ref(false)
const isProcessing = ref(false)
const progress = ref(0)
const audioError = ref(null)
const selectedAudioFile = ref(null)
const isDragOver = ref(false)
const outputType = ref('both') // 'tamil' or 'both'
const tamilTranscript = ref('')
const englishTranslation = ref('')

// Web Speech API
let recognition = null
let mediaRecorder = null
let audioChunks = []

const audioInput = ref(null)

// Initialize Speech Recognition
const initSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    audioError.value = 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.'
    return null
  }
  
  recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'ta-IN' // Tamil (India)
  
  recognition.onresult = (event) => {
    let interimTranscript = ''
    let finalTranscript = ''
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }
    
    tamilTranscript.value = finalTranscript || interimTranscript
    
    // If we have final text, translate it
    if (finalTranscript) {
      translateText(finalTranscript)
    }
  }
  
  recognition.onerror = (event) => {
    console.error('Recognition error:', event.error)
    audioError.value = `Recognition error: ${event.error}`
    stopRecording()
  }
  
  recognition.onend = () => {
    isRecording.value = false
  }
  
  return recognition
}

// Start Recording
const startRecording = async () => {
  audioError.value = null
  tamilTranscript.value = ''
  englishTranslation.value = ''
  
  try {
    // Try Web Speech API first (for live recording)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = initSpeechRecognition()
      if (recognition) {
        recognition.start()
        isRecording.value = true
        return
      }
    }
    
    // Fallback to MediaRecorder for file upload
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' })
      selectedAudioFile.value = audioFile
      await processAudioFile(audioFile)
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop())
    }
    
    mediaRecorder.start()
    isRecording.value = true
    
  } catch (error) {
    console.error('Error starting recording:', error)
    audioError.value = 'Could not access microphone. Please check permissions.'
  }
}

// Stop Recording
const stopRecording = () => {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  isRecording.value = false
}

// Handle Audio Drop
const handleAudioDrop = (e) => {
  isDragOver.value = false
  const files = Array.from(e.dataTransfer.files)
  const audioFile = files.find(file => file.type.startsWith('audio/'))
  if (audioFile) {
    processAudioFile(audioFile)
  } else {
    audioError.value = 'Please drop an audio file (MP3, WAV, M4A, OGG)'
  }
}

// Handle Audio Select
const handleAudioSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    processAudioFile(file)
  }
}

// Trigger Audio Input
const triggerAudioInput = () => {
  if (!isRecording.value && !isProcessing.value) {
    audioInput.value.click()
  }
}

// Process Audio File
const processAudioFile = async (file) => {
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg']
  const maxSize = 20 * 1024 * 1024 // 20MB
  
  if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
    audioError.value = 'Please upload MP3, WAV, M4A, or OGG audio files only.'
    return
  }
  
  if (file.size > maxSize) {
    audioError.value = 'Audio file size should be less than 20MB.'
    return
  }
  
  selectedAudioFile.value = file
  audioError.value = null
  tamilTranscript.value = ''
  englishTranslation.value = ''
  
  await performSpeechToText(file)
}

// Perform Speech to Text (using Web Speech API for simplicity)
// Note: For production, you'd want to use a proper speech-to-text API like Google Speech-to-Text, Azure, or Whisper
const performSpeechToText = async (audioFile) => {
  isProcessing.value = true
  progress.value = 0
  
  try {
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 500)
    
    // For demo purposes, we're using a simulated response
    // In production, replace this with actual API call to:
    // - Google Speech-to-Text API
    // - Azure Speech Services
    // - OpenAI Whisper API
    // - AssemblyAI
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    clearInterval(progressInterval)
    progress.value = 100
    
    // This is a simulation - replace with actual API call
    const fileName = audioFile.name.toLowerCase()
    let simulatedText = ''
    
    // Simulate different responses based on file name for demo
    if (fileName.includes('tamil') || fileName.includes('vanakkam')) {
      simulatedText = 'வணக்கம், எப்படி இருக்கீங்க? நான் நல்லா இருக்கேன். உங்களை சந்தித்ததில் மிகவும் மகிழ்ச்சி.'
    } else if (fileName.includes('hello') || fileName.includes('hi')) {
      simulatedText = 'வணக்கம்! இன்று வானிலை மிகவும் அழகாக இருக்கிறது. நீங்கள் எங்கே போகிறீர்கள்?'
    } else {
      simulatedText = 'வணக்கம். இது ஒரு சோதனை ஆடியோ கோப்பு. தயவு செய்து உண்மையான Tamil ஆடியோவை பதிவேற்றவும்.'
    }
    
    tamilTranscript.value = simulatedText
    await translateText(simulatedText)
    
    setTimeout(() => {
      progress.value = 0
      isProcessing.value = false
    }, 500)
    
  } catch (error) {
    console.error('Speech to text error:', error)
    audioError.value = 'Failed to process audio. Please try again.'
    progress.value = 0
    isProcessing.value = false
  }
}

// Translate Tamil text to English using Claude API
const translateText = async (tamilText) => {
  if (outputType.value !== 'both') return
  
  try {
    const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
    
    if (!API_KEY) {
      englishTranslation.value = 'Translation unavailable: API key not configured'
      return
    }
    
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Translate the following Tamil text to English:\n\n${tamilText}`
          }
        ]
      })
    })
    
    const data = await response.json()
    if (data.content && data.content[0]) {
      englishTranslation.value = data.content[0].text
    } else {
      englishTranslation.value = 'Translation failed. Please try again.'
    }
  } catch (error) {
    console.error('Translation error:', error)
    englishTranslation.value = 'Translation service unavailable.'
  }
}

// Clear Audio File
const clearAudioFile = () => {
  selectedAudioFile.value = null
  tamilTranscript.value = ''
  englishTranslation.value = ''
  audioError.value = null
  if (audioInput.value) {
    audioInput.value.value = ''
  }
}

// Format File Size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Copy to Clipboard
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}

// Insert to Editor
const insertToEditor = (text) => {
  emit('text-extracted', text)
}

// Clean up on unmount
onBeforeUnmount(() => {
  if (recognition) {
    recognition.stop()
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
})
</script>

<style scoped>
.audio-to-text {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.audio-header h3 {
  margin: 0 0 8px 0;
  color: #1a1a2e;
  font-size: 18px;
}

.audio-description {
  color: #666;
  font-size: 13px;
  margin: 0 0 20px 0;
}

.audio-two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Left Column */
.audio-left {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.audio-input-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.recording-section {
  text-align: center;
}

.record-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.record-btn, .stop-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.record-btn {
  background: #e74c3c;
  color: white;
}

.record-btn:hover:not(:disabled) {
  background: #c0392b;
  transform: scale(1.02);
}

.record-btn.recording {
  background: #e74c3c;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.stop-btn {
  background: #555;
  color: white;
}

.stop-btn:hover {
  background: #333;
}

.record-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.waveform {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
}

.waveform span {
  width: 4px;
  height: 100%;
  background: #e74c3c;
  animation: wave 1s ease-in-out infinite;
}

.waveform span:nth-child(1) { animation-delay: 0s; height: 15px; }
.waveform span:nth-child(2) { animation-delay: 0.1s; height: 25px; }
.waveform span:nth-child(3) { animation-delay: 0.2s; height: 30px; }
.waveform span:nth-child(4) { animation-delay: 0.3s; height: 20px; }
.waveform span:nth-child(5) { animation-delay: 0.4s; height: 10px; }

@keyframes wave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.5); }
}

.upload-section {
  text-align: center;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.upload-area:hover {
  border-color: #6c47ff;
  background: #f5f3ff;
}

.upload-area.drag-over {
  border-color: #6c47ff;
  background: #f0edff;
}

.upload-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 11px;
  color: #999;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #e8f4fd;
  border-radius: 8px;
  font-size: 13px;
}

.file-icon {
  font-size: 18px;
}

.file-name {
  flex: 1;
  color: #333;
  word-break: break-all;
}

.file-size {
  color: #666;
  font-size: 11px;
}

.remove-file-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 0 4px;
}

.remove-file-btn:hover {
  color: #e74c3c;
}

.processing-status {
  text-align: center;
  padding: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0edff;
  border-top-color: #6c47ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-text {
  color: #6c47ff;
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
}

.progress-fill {
  height: 100%;
  background: #6c47ff;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #666;
}

/* Right Column */
.audio-right {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.results-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.language-selector {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.radio-label input {
  cursor: pointer;
  accent-color: #6c47ff;
}

.result-box {
  background: white;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.result-icon {
  font-size: 18px;
}

.result-title {
  flex: 1;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.copy-btn, .insert-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
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

.insert-btn {
  background: #6c47ff;
  color: white;
}

.insert-btn:hover {
  background: #5835e0;
}

.result-content {
  font-size: 15px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.result-content.tamil-text {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  color: #999;
  font-size: 14px;
  margin-bottom: 8px;
}

.empty-hint {
  color: #bbb;
  font-size: 12px;
}

.error-message {
  margin-top: 12px;
  padding: 10px;
  background: #ffe0e0;
  color: #d32f2f;
  border-radius: 6px;
  font-size: 13px;
}

/* Tips Section */
.audio-tips {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.audio-tips h4 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 13px;
}

.audio-tips ul {
  margin: 0;
  padding-left: 20px;
}

.audio-tips li {
  color: #888;
  font-size: 12px;
  margin: 4px 0;
}

.pulse-ring {
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #ff4444;
  border-radius: 50%;
  margin-right: 8px;
  animation: pulse-ring 1s infinite;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
}

/* Responsive */
@media (max-width: 768px) {
  .audio-two-columns {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .audio-left, .audio-right {
    padding: 16px;
  }
  
  .record-btn, .stop-btn {
    padding: 10px 20px;
    font-size: 12px;
  }
  
  .result-content {
    font-size: 13px;
  }
  
  .language-selector {
    flex-direction: column;
    gap: 10px;
  }
}
</style>