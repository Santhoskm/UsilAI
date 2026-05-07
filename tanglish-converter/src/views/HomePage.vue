<template>
  <div class="home-page">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <div class="logo-container">
          <span class="logo-icon"></span>
          <h1 class="app-name">Usil AI</h1>
        </div>
        <p class="tagline">Intelligent Tamil Language Assistant</p>
        <p class="description">
          Usil AI helps you write, convert, and understand Tamil effortlessly. 
          From Tanglish to Tamil conversion, OCR text extraction, audio transcription,
          and AI-powered blog generation with SEO optimization.
        </p>
      </div>
    </div>

    <!-- Tanglish Editor Section (Only visible when NOT logged in) -->
    <div v-if="!isAuthenticated" class="editor-section">
      <div class="section-header">
        <h2 class="section-title"> Tanglish to Tamil Editor</h2>
        <p class="section-subtitle">Start typing in Tanglish, get Tamil instantly - No login required!</p>
      </div>
      <div class="editor-preview">
        <TanglishEditor />
      </div>
    </div>

    <!-- All Tools Section -->
    <div class="tools-section">
      <div class="section-header">
        <h2 class="section-title">{{ isAuthenticated ? ' All Tools' : ' Premium Tools' }}</h2>
        <p class="section-subtitle">
          {{ isAuthenticated ? 'All tools are now unlocked for you!' : 'Login to unlock all premium features' }}
        </p>
      </div>
      
      <div class="features-grid">
        <!-- Tool 1: Tanglish Editor (FREE - Always accessible via navigation) -->
        <div class="feature-card" @click="handleToolClick('/editor', true)">
          <div class="card-icon"></div>
          <h3 class="card-title">Tanglish Editor</h3>
          <p class="card-description">
            Write in Tanglish and watch it convert to Tamil automatically. 
            Smart suggestions and real-time conversion with AI grammar check.
          </p>
          <!-- <div class="card-footer">
            <span class="badge free-badge">FREE</span>
            <span class="try-now">Try Now →</span>
          </div> -->
        </div>

        <!-- Tool 2: OCR Text Extraction (Requires Login) -->
        <div 
          class="feature-card" 
          :class="{ locked: !isAuthenticated }" 
          @click="handleToolClick('/ocr', false)"
        >
          <div class="card-icon"></div>
          <h3 class="card-title">OCR Text Extraction</h3>
          <p class="card-description">
            Extract Tamil text from images. Upload photos of documents, 
            signs, or handwritten notes and get editable text instantly.
          </p>
          <!-- <div class="card-footer">
            <span v-if="!isAuthenticated" class="badge locked-badge"></span>
            <span  class="try-now">Try Now →</span>
          </div> -->
        </div>

        <!-- Tool 3: Audio to Text (Requires Login) -->
        <div 
          class="feature-card" 
          :class="{ locked: !isAuthenticated }" 
          @click="handleToolClick('/audio', false)"
        >
          <div class="card-icon"></div>
          <h3 class="card-title">Audio to Text</h3>
          <p class="card-description">
            Convert Tamil speech to text. Record or upload audio files 
            and get accurate transcripts with English translation.
          </p>
          <!-- <div class="card-footer">
            <span v-if="!isAuthenticated" class="badge locked-badge">🔒 Locked</span>
            <span v-else class="try-now">Try Now →</span>
          </div> -->
        </div>

        <!-- Tool 4: Tamil Blog Generator (Requires Login) -->
        <div 
          class="feature-card" 
          :class="{ locked: !isAuthenticated }" 
          @click="handleToolClick('/blog', false)"
        >
          <div class="card-icon"></div>
          <h3 class="card-title">Tamil Blog Generator</h3>
          <p class="card-description">
            Generate SEO-optimized Tamil blog posts. Enter a topic, choose tone and length,
            and get AI-generated content with English & Tamil keywords.
          </p>
          <!-- <div class="card-footer">
            <span v-if="!isAuthenticated" class="badge locked-badge">🔒 Locked</span>
            <span v-else class="try-now">Try Now →</span>
          </div> -->
        </div>

        <!-- Tool 5: Subtitle Generator (Requires Login) -->
        <div 
          class="feature-card" 
          :class="{ locked: !isAuthenticated }" 
           @click="handleToolClick('/subtitle', false)" 
        >
          <div class="card-icon"></div>
          <h3 class="card-title">Subtitle Generator</h3>
          <p class="card-description">
            Create professional Tamil subtitles in SRT, VTT, or ASS formats.
            AI-powered grammar check and auto-timing for perfect synchronization.
          </p>
          <!-- <div class="card-footer">
            <span v-if="!isAuthenticated" class="badge locked-badge">🔒 Locked</span>
            <span v-else class="try-now">Try Now →</span>
          </div> -->
        </div>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">5</div>
          <div class="stat-label">Total Tools</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ isAuthenticated ? '5' : '1' }}</div>
          <div class="stat-label">Available Now</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">AI</div>
          <div class="stat-label">Powered Grammar</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <p>© 2026 Usil AI - Intelligent Tamil Language Assistant</p>
    </footer>

    <!-- Login Modal for Locked Tools -->
    <!-- <div v-if="showLoginModal" class="login-overlay" @click.self="closeLoginModal">
      <div class="login-modal">
        <button class="modal-close" @click="closeLoginModal">×</button>
        <div class="modal-icon">🔓</div>
        <h3 class="modal-title">Login Required</h3>
        <p class="modal-description">
          Please login to access this premium feature
        </p>
        <button class="modal-login-btn" @click="openAuthModal">
          Login Now →
        </button>
        <p class="modal-note">
          ✨ Tanglish Editor is completely FREE - no login required!
        </p>
      </div>
    </div> -->

    <!-- Auth Modal -->
    <AuthModal 
      :isOpen="showAuthModal" 
      @close="closeAuthModal"
      @success="onLoginSuccess"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import TanglishEditor from '@/components/TanglishEditor.vue'
import AuthModal from '@/components/AuthModal.vue'
import { ref } from 'vue'

const router = useRouter()
const { isAuthenticated } = useAuth()
const showAuthModal = ref(false)
const showLoginModal = ref(false)
const pendingPath = ref(null)

const handleToolClick = (path, isFree) => {
  if (isFree) {
    // Free tool - navigate directly
    router.push(path)
  } else {
    // Premium tool - check authentication
    if (isAuthenticated.value) {
      router.push(path)
    } else {
      // Show login prompt modal
      pendingPath.value = path
      showLoginModal.value = true
    }
  }
}

const closeLoginModal = () => {
  showLoginModal.value = false
  pendingPath.value = null
}

const openAuthModal = () => {
  closeLoginModal()
  showAuthModal.value = true
}

const closeAuthModal = () => {
  showAuthModal.value = false
}

const onLoginSuccess = () => {
  closeAuthModal()
  // If there was a pending path, navigate to it
  if (pendingPath.value) {
    router.push(pendingPath.value)
    pendingPath.value = null
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Hero Section */
.hero-section {
  padding: 60px 20px 50px;
  text-align: center;
  color: white;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.logo-icon {
  font-size: 48px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.app-name {
  font-size: 56px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #fff, #e0d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 20px;
  opacity: 0.95;
}

.description {
  font-size: 18px;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
  opacity: 0.9;
}

/* Editor Section - Only visible when not logged in */
.editor-section {
  background: white;
  padding: 60px 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12px;
}

.section-subtitle {
  font-size: 16px;
  color: #666;
}

.editor-preview {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Tools Section */
.tools-section {
  background: #f8f9fa;
  padding: 60px 20px;
}

.features-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  padding: 0 20px;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #eee;
  position: relative;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  border-color: #667eea;
}

.feature-card.locked {
  opacity: 0.85;
}

.feature-card.locked:hover {
  transform: translateY(-4px);
}

.card-icon {
  font-size: 56px;
  margin-bottom: 20px;
}

.card-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
}

.card-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
  min-height: 80px;
  font-size: 14px;
}

.card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.free-badge {
  background: #27ae60;
  color: white;
}

.locked-badge {
  background: #e74c3c;
  color: white;
}

.try-now {
  display: inline-block;
  padding: 8px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 25px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.feature-card:hover .try-now {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Login Modal Overlay */
.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.login-modal {
  background: white;
  border-radius: 32px;
  padding: 48px 40px;
  max-width: 440px;
  width: 90%;
  text-align: center;
  position: relative;
  animation: slideUp 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 24px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.modal-close:hover {
  color: #333;
  background: #f0f0f0;
}

.modal-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12px;
}

.modal-description {
  color: #666;
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 28px;
}

.modal-login-btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 20px;
  width: 100%;
}

.modal-login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.modal-note {
  font-size: 12px;
  color: #999;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

/* Stats Section */
.stats-section {
  background: white;
  padding: 60px 20px;
}

.stats-grid {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  text-align: center;
}

.stat-item {
  color: #1a1a2e;
}

.stat-number {
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 16px;
  color: #666;
}

/* Footer */
.footer {
  text-align: center;
  padding: 30px;
  background: #1a1a2e;
  color: #888;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-section {
    padding: 40px 20px 30px;
  }
  
  .app-name {
    font-size: 40px;
  }
  
  .tagline {
    font-size: 18px;
  }
  
  .description {
    font-size: 14px;
  }
  
  .section-title {
    font-size: 24px;
  }
  
  .editor-section,
  .tools-section,
  .stats-section {
    padding: 40px 16px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 0;
  }
  
  .card-description {
    min-height: auto;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .login-modal {
    padding: 36px 24px;
  }
  
  .modal-title {
    font-size: 24px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>