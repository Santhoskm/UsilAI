<template>
  <div class="blog-generator">
    <div class="generator-header">
      <h2> Tamil Blog Generator</h2>
      <p class="description">
        Generate SEO-optimized Tamil blog posts with English and Tamil keywords
      </p>
    </div>

    <div class="two-columns">
      <!-- Left Column - Input Section -->
      <div class="input-column">
        <div class="input-section">
          <!-- Topic Input -->
          <div class="form-group">
            <label>Topic / Title</label>
            <input
              v-model="topic"
              type="text"
              placeholder="Enter topic in Tamil or English (e.g., Digital Marketing, சுற்றுச்சூழல் பாதுகாப்பு)"
              class="topic-input"
            />
          </div>

          <!-- Writing Tone Selection -->
          <div class="form-group">
            <label>Writing Tone</label>
            <div class="tone-options">
              <button
                v-for="tone in toneOptions"
                :key="tone.value"
                @click="selectedTone = tone.value"
                :class="{ active: selectedTone === tone.value }"
                class="tone-btn"
              >
                <span class="tone-icon">{{ tone.icon }}</span>
                <span class="tone-label">{{ tone.label }}</span>
                <span class="tone-tamil">{{ tone.tamil }}</span>
              </button>
            </div>
          </div>

          <!-- Word Count Selection -->
          <div class="form-group">
            <label>Word Count</label>
            <div class="word-count-options">
              <button
                v-for="count in wordCountOptions"
                :key="count.value"
                @click="selectedWordCount = count.value"
                :class="{ active: selectedWordCount === count.value }"
                class="word-count-btn"
              >
                {{ count.label }} ({{ count.value }}+ words)
              </button>
            </div>
          </div>

          <!-- Additional Instructions -->
          <div class="form-group">
            <label>Additional Instructions (Optional)</label>
            <textarea
              v-model="additionalInstructions"
              placeholder="E.g., Focus on beginner-friendly content, include statistics, add call-to-action..."
              class="instructions-input"
              rows="3"
            ></textarea>
          </div>

          <!-- Generate Button -->
          <button
            @click="generateBlog"
            :disabled="isGenerating || !topic.trim()"
            class="generate-btn"
          >
            <span v-if="!isGenerating"> Generate Blog Post</span>
            <span v-else>
              <span class="spinner"></span>
              Generating...
            </span>
          </button>

          <!-- Progress -->
          <div v-if="isGenerating" class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="progress-text">{{ progressMessage }}</div>
          </div>
        </div>
      </div>

      <!-- Right Column - Output Section -->
      <div class="output-column">
        <div class="output-header">
          <div class="output-tabs">
            <button
              @click="activeTab = 'blog'"
              :class="{ active: activeTab === 'blog' }"
              class="tab-btn"
            >
               Blog Post
            </button>
            <button
              @click="activeTab = 'seo'"
              :class="{ active: activeTab === 'seo' }"
              class="tab-btn"
            >
               SEO Keywords
            </button>
            <button
              @click="activeTab = 'tamil-seo'"
              :class="{ active: activeTab === 'tamil-seo' }"
              class="tab-btn"
            >
               Tamil Keywords
            </button>
          </div>
          <div class="output-actions" v-if="generatedBlog">
            <button @click="copyToClipboard(generatedBlog)" class="copy-btn">
               Copy Blog
            </button>
            <button @click="exportToMarkdown" class="export-btn">
              Export MD
            </button>
          </div>
        </div>

        <div class="output-content">
          <!-- Blog Post Tab -->
          <div v-if="activeTab === 'blog'" class="blog-content">
            <div v-if="isGenerating && !generatedBlog" class="loading-state">
              <div class="loading-spinner"></div>
              <p>AI is crafting your Tamil blog post...</p>
            </div>
            <div v-else-if="generatedBlog" class="generated-blog">
              <div class="blog-meta" v-if="blogMeta">
                <span class="meta-item">{{ blogMeta.wordCount }} words</span>
                <span class="meta-item">{{ getToneLabel(blogMeta.tone) }}</span>
                <span class="meta-item">{{ blogMeta.readingTime }} min read</span>
              </div>
              <div class="blog-text" v-html="formattedBlog"></div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon"></div>
              <p>Enter a topic and click "Generate Blog Post"</p>
              <small>AI will create a complete Tamil blog with SEO keywords</small>
            </div>
          </div>

          <!-- English SEO Keywords Tab -->
          <div v-if="activeTab === 'seo'" class="seo-content">
            <div v-if="seoKeywords" class="keywords-section">
              <div class="keyword-category">
                <h4> Primary Keywords</h4>
                <div class="keyword-tags">
                  <span v-for="kw in seoKeywords.primary" :key="kw" class="keyword-tag primary">
                    {{ kw }}
                  </span>
                </div>
              </div>
              <div class="keyword-category">
                <h4> Secondary Keywords</h4>
                <div class="keyword-tags">
                  <span v-for="kw in seoKeywords.secondary" :key="kw" class="keyword-tag secondary">
                    {{ kw }}
                  </span>
                </div>
              </div>
              <div class="keyword-category">
                <h4> Long-tail Keywords</h4>
                <div class="keyword-tags">
                  <span v-for="kw in seoKeywords.longTail" :key="kw" class="keyword-tag longtail">
                    {{ kw }}
                  </span>
                </div>
              </div>
              <div class="keyword-category">
                <h4> LSI Keywords</h4>
                <div class="keyword-tags">
                  <span v-for="kw in seoKeywords.lsi" :key="kw" class="keyword-tag lsi">
                    {{ kw }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon"></div>
              <p>Generate a blog to see SEO keywords</p>
            </div>
          </div>

          <!-- Tamil SEO Keywords Tab -->
          <div v-if="activeTab === 'tamil-seo'" class="tamil-seo-content">
            <div v-if="tamilSeoKeywords" class="keywords-section">
              <div class="keyword-category">
                <h4> முதன்மை முக்கிய சொற்கள் (Primary)</h4>
                <div class="keyword-tags">
                  <span v-for="kw in tamilSeoKeywords.primary" :key="kw" class="keyword-tag tamil-primary">
                    {{ kw }}
                  </span>
                </div>
              </div>
              <div class="keyword-category">
                <h4> இரண்டாம் நிலை முக்கிய சொற்கள் (Secondary)</h4>
                <div class="keyword-tags">
                  <span v-for="kw in tamilSeoKeywords.secondary" :key="kw" class="keyword-tag tamil-secondary">
                    {{ kw }}
                  </span>
                </div>
              </div>
              <div class="keyword-category">
                <h4> நீண்ட-வால் முக்கிய சொற்கள் (Long-tail)</h4>
                <div class="keyword-tags">
                  <span v-for="kw in tamilSeoKeywords.longTail" :key="kw" class="keyword-tag tamil-longtail">
                    {{ kw }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon"></div>
              <p>Generate a blog to see Tamil SEO keywords</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const emit = defineEmits(['blog-generated'])

// State
const topic = ref('')
const selectedTone = ref('conversational')
const selectedWordCount = ref(500)
const additionalInstructions = ref('')
const isGenerating = ref(false)
const progress = ref(0)
const progressMessage = ref('')
const generatedBlog = ref('')
const blogMeta = ref(null)
const seoKeywords = ref(null)
const tamilSeoKeywords = ref(null)
const activeTab = ref('blog')

// Options
const toneOptions = [
  { value: 'conversational', label: 'Conversational', tamil: 'உரையாடல்', icon: '' },
  { value: 'educational', label: 'Educational', tamil: 'கல்வி', icon: '' },
  { value: 'professional', label: 'Professional', tamil: 'தொழில்முறை', icon: '' },
  { value: 'storytelling', label: 'Storytelling', tamil: 'கதை', icon: '' }
]

const wordCountOptions = [
  { value: 300, label: 'Short' },
  { value: 500, label: 'Standard' },
  { value: 800, label: 'Detailed' },
  { value: 1000, label: 'Comprehensive' }
]

// Computed
const formattedBlog = computed(() => {
  if (!generatedBlog.value) return ''
  return generatedBlog.value.replace(/\n/g, '<br>')
})

// Helper functions
const getToneLabel = (toneValue) => {
  const tone = toneOptions.find(t => t.value === toneValue)
  return tone ? `${tone.label} (${tone.tamil})` : toneValue
}

const generateBlog = async () => {
  if (!topic.value.trim()) return

  isGenerating.value = true
  progress.value = 0
  progressMessage.value = 'Analyzing topic...'
  generatedBlog.value = ''
  seoKeywords.value = null
  tamilSeoKeywords.value = null

  try {
    const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
    
    if (!API_KEY) {
      throw new Error('Claude API key not configured')
    }

    // Progress simulation
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
        if (progress.value === 30) progressMessage.value = 'Researching keywords...'
        if (progress.value === 50) progressMessage.value = 'Writing blog content...'
        if (progress.value === 70) progressMessage.value = 'Optimizing for SEO...'
        if (progress.value === 85) progressMessage.value = 'Finalizing...'
      }
    }, 800)

    const prompt = `You are an expert Tamil content writer and SEO specialist. Generate a comprehensive blog post based on the following requirements:

TOPIC: "${topic.value}"
WRITING TONE: ${selectedTone.value} (${toneOptions.find(t => t.value === selectedTone.value)?.tamil})
TARGET WORD COUNT: ${selectedWordCount.value} words
${additionalInstructions.value ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions.value}` : ''}

Please generate the following in valid JSON format:

{
  "blog": {
    "title": "Tamil blog title (catchy and SEO-optimized)",
    "content": "Full Tamil blog content with proper formatting using line breaks. Include introduction, main points (2-3 subheadings), conclusion.",
    "meta": {
      "wordCount": "actual word count",
      "readingTime": "estimated minutes to read",
      "tone": "${selectedTone.value}"
    }
  },
  "seoKeywords": {
    "primary": ["3-4 primary English keywords"],
    "secondary": ["5-6 secondary English keywords"],
    "longTail": ["4-5 long-tail English keywords"],
    "lsi": ["4-5 LSI English keywords"]
  },
  "tamilSeoKeywords": {
    "primary": ["3-4 primary Tamil keywords (தமிழில்)"],
    "secondary": ["5-6 secondary Tamil keywords (தமிழில்)"],
    "longTail": ["4-5 long-tail Tamil keywords (தமிழில்)"]
  }
}

Requirements:
- Blog content MUST be in Tamil language (Tamil script)
- Keep the tone ${selectedTone.value} throughout
- Include natural keyword placement
- Make it engaging and valuable for readers
- SEO keywords should be relevant to the topic
- Tamil keywords should be accurate and commonly searched
- Title should be compelling in Tamil`

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.7,
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
        'anthropic-version': '2023-06-01'
      },
      timeout: 60000
    })

    clearInterval(progressInterval)
    progress.value = 100
    progressMessage.value = 'Complete!'

    const claudeResponse = response.data.content[0].text
    const parsed = parseResponse(claudeResponse)

    if (parsed) {
      generatedBlog.value = `# ${parsed.blog.title}\n\n${parsed.blog.content}`
      blogMeta.value = parsed.blog.meta
      seoKeywords.value = parsed.seoKeywords
      tamilSeoKeywords.value = parsed.tamilSeoKeywords
      
      emit('blog-generated', {
        blog: generatedBlog.value,
        seoKeywords: parsed.seoKeywords,
        tamilSeoKeywords: parsed.tamilSeoKeywords
      })
    } else {
      throw new Error('Failed to parse response')
    }

    setTimeout(() => {
      progress.value = 0
      isGenerating.value = false
    }, 500)

  } catch (error) {
    console.error('Blog generation error:', error)
    progressMessage.value = `Error: ${error.message}`
    setTimeout(() => {
      isGenerating.value = false
      progress.value = 0
    }, 2000)
  }
}

const parseResponse = (response) => {
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

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}

const exportToMarkdown = () => {
  const blob = new Blob([generatedBlog.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `blog-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.blog-generator {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.generator-header {
  text-align: center;
  margin-bottom: 32px;
}

.generator-header h2 {
  font-size: 28px;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.generator-header .description {
  color: #666;
  font-size: 14px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Left Column */
.input-column {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.topic-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.topic-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.tone-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tone-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.tone-btn:hover {
  border-color: #667eea;
  background: #f5f3ff;
}

.tone-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tone-icon {
  font-size: 20px;
}

.tone-label {
  font-weight: 500;
  font-size: 13px;
}

.tone-tamil {
  font-size: 11px;
  opacity: 0.8;
}

.word-count-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.word-count-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.word-count-btn:hover {
  border-color: #667eea;
  background: #f5f3ff;
}

.word-count-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.instructions-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
}

.instructions-input:focus {
  outline: none;
  border-color: #667eea;
}

.generate-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-section {
  margin-top: 16px;
}

.progress-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  text-align: center;
}

/* Right Column */
.output-column {
  background: #f8f9fa;
  border-radius: 12px;
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
  border: none;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e0e0e0;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.output-actions {
  display: flex;
  gap: 8px;
}

.copy-btn, .export-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.copy-btn {
  background: #e0e0e0;
  color: #666;
}

.copy-btn:hover {
  background: #ccc;
}

.export-btn {
  background: #27ae60;
  color: white;
}

.export-btn:hover {
  background: #219a52;
}

.output-content {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
}

.blog-content, .seo-content, .tamil-seo-content {
  height: 100%;
}

.generated-blog {
  line-height: 1.8;
}

.blog-meta {
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  color: #666;
}

.blog-text {
  font-size: 15px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.keywords-section {
  padding: 8px;
}

.keyword-category {
  margin-bottom: 24px;
}

.keyword-category h4 {
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
}

.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.keyword-tag.primary {
  background: #e8f4fd;
  color: #3498db;
}

.keyword-tag.secondary {
  background: #fef3e2;
  color: #f39c12;
}

.keyword-tag.longtail {
  background: #e8f8f5;
  color: #1abc9c;
}

.keyword-tag.lsi {
  background: #f0edff;
  color: #6c47ff;
}

.keyword-tag.tamil-primary {
  background: #e8f4fd;
  color: #3498db;
  font-family: 'Noto Sans Tamil', sans-serif;
}

.keyword-tag.tamil-secondary {
  background: #fef3e2;
  color: #f39c12;
  font-family: 'Noto Sans Tamil', sans-serif;
}

.keyword-tag.tamil-longtail {
  background: #e8f8f5;
  color: #1abc9c;
  font-family: 'Noto Sans Tamil', sans-serif;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  color: #999;
  margin-bottom: 8px;
}

.empty-state small {
  color: #bbb;
  font-size: 12px;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0edff;
  border-top-color: #6c47ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .two-columns {
    grid-template-columns: 1fr;
  }
  
  .tone-options {
    grid-template-columns: 1fr;
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
}
</style>