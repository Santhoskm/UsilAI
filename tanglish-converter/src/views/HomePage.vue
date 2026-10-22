<template>
  <div class="home-page-container">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-inner">
        <!-- Hero Left Column: Text & Features -->
        <div class="hero-text-block">
          <h1 class="hero-title">
            <span class="title-primary">Write naturally.</span><br />
            <span class="title-gradient">Create in Tamil.</span>
          </h1>

          <p class="hero-description">
            Convert Tanglish, extract text, transcribe audio, and create Tamil content with AI.
          </p>

          <!-- Feature Pills Bar -->
          <div class="hero-features-bar">
            <div class="feature-badge" @click="scrollToEditor">
              <span class="feat-icon">文A</span>
              <span class="feat-label">Tanglish to Tamil</span>
            </div>
            <span class="feat-divider">|</span>
            <div class="feature-badge" @click="handleToolNavigate('/editor')">
              <span class="feat-icon">📄</span>
              <span class="feat-label">Tamil Documents</span>
            </div>
            <span class="feat-divider">|</span>
            <div class="feature-badge" @click="handleToolNavigate('/ocr')">
              <span class="feat-icon">⛶</span>
              <span class="feat-label">OCR</span>
            </div>
            <span class="feat-divider">|</span>
            <div class="feature-badge" @click="handleToolNavigate('/audio')">
              <span class="feat-icon">🎙️</span>
              <span class="feat-label">Audio Transcription</span>
            </div>
            <span class="feat-divider">|</span>
            <div class="feature-badge" @click="handleToolNavigate('/subtitle')">
              <span class="feat-icon">🎬</span>
              <span class="feat-label">Subtitles</span>
            </div>
          </div>
        </div>

        <!-- Hero Right Column: 3D Floating Tamil Graphic -->
        <div class="hero-art-block">
          <div class="art-composition">
            <!-- Ambient Glow Effect -->
            <div class="aura-glow"></div>
            
            <!-- Cloud Backdrop -->
            <div class="cloud-backdrop"></div>

            <!-- Floating Mini Orb (Top-Left: த) -->
            <div class="floating-orb orb-tha">
              <span>த</span>
            </div>

            <!-- Central Glowing Square (Letter அ) -->
            <div class="central-tamil-card">
              <span class="tamil-char-hero">அ</span>
            </div>

            <!-- Floating Mini Orb (Right: ம்) -->
            <div class="floating-orb orb-m">
              <span>ம்</span>
            </div>

            <!-- Sparkling Accents -->
            <div class="sparkle-star star-1">✦</div>
            <div class="sparkle-star star-2">✦</div>
            <div class="sparkle-dash dash-1"></div>
            <div class="sparkle-dash dash-2"></div>
            <div class="sparkle-dash dash-3"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Workspace Section: Editor + AI Tools -->
    <section class="workspace-section">
      <div class="workspace-grid">
        <!-- Left: Tanglish to Tamil Editor Card (~70%) -->
        <div class="editor-column">
          <div class="editor-outer-card">
            <!-- Card Header Banner -->
            <div class="editor-card-header">
              <div class="editor-header-badge">
                <span class="badge-icon">文A</span>
              </div>
              <div class="editor-header-titles">
                <h2 class="card-main-title">Tanglish to Tamil Editor</h2>
                <p class="card-subtitle">
                  Type in Tanglish — it converts to Tamil automatically when you press space or punctuation.
                </p>
              </div>
            </div>

            <!-- Tanglish Editor Component (Sidebar disabled on home page per user request) -->
            <div class="editor-component-wrapper">
              <TanglishEditor :enableSidebar="false" />
            </div>
          </div>
        </div>

        <!-- Right: AI Tools Panel (~30%) -->
        <div id="ai-tools" class="ai-tools-column">
          <div class="ai-tools-card">
            <!-- Tools Panel Header -->
            <div class="tools-card-header">
              <span class="sparkle-badge">✦</span>
              <h3 class="tools-header-title">AI Tools</h3>
            </div>

            <!-- AI Tool Cards -->
            <div class="tools-stack">
              <!-- Tool 1: Tamil Documents & Cloud Workspace (Matching user request Image 3) -->
              <div 
                class="tool-feature-item docs-theme"
                @click="handleToolNavigate('/editor')"
              >
                <div class="tool-icon-box">
                  <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div class="tool-content">
                  <h4 class="tool-name">Tamil documents</h4>
                  <p class="tool-desc">Save up to 5 persistent multi-file documents in PostgreSQL.</p>
                </div>
                <div class="tool-arrow">›</div>
              </div>

              <!-- Tool 2: OCR Text Extraction -->
              <div 
                class="tool-feature-item ocr-theme"
                @click="handleToolNavigate('/ocr')"
              >
                <div class="tool-icon-box">
                  <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2M16 20h2a2 2 0 0 0 2-2v-2" stroke-linecap="round"/>
                    <rect x="8" y="8" width="8" height="8" rx="2"/>
                  </svg>
                </div>
                <div class="tool-content">
                  <h4 class="tool-name">OCR text extraction</h4>
                  <p class="tool-desc">Extract text from images and scanned documents.</p>
                </div>
                <div class="tool-arrow">›</div>
              </div>

              <!-- Tool 3: Audio Transcription -->
              <div 
                class="tool-feature-item audio-theme"
                @click="handleToolNavigate('/audio')"
              >
                <div class="tool-icon-box">
                  <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </div>
                <div class="tool-content">
                  <h4 class="tool-name">Audio transcription</h4>
                  <p class="tool-desc">Convert speech to text in Tamil or English.</p>
                </div>
                <div class="tool-arrow">›</div>
              </div>

              <!-- Tool: Tamil Subtitles -->
              <div 
                class="tool-feature-item subtitles-theme"
                @click="handleToolNavigate('/subtitle')"
              >
                <div class="tool-icon-box">
                  <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <line x1="6" y1="15" x2="10" y2="15"/>
                    <line x1="14" y1="15" x2="18" y2="15"/>
                    <line x1="6" y1="11" x2="18" y2="11"/>
                  </svg>
                </div>
                <div class="tool-content">
                  <h4 class="tool-name">Tamil subtitles</h4>
                  <p class="tool-desc">Create, sync, and export SRT & VTT subtitles for videos.</p>
                </div>
                <div class="tool-arrow">›</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Google Sign-In Modal -->
    <AuthModal 
      :isOpen="showAuthModal" 
      @close="showAuthModal = false"
      @success="onAuthSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import TanglishEditor from '@/components/TanglishEditor.vue'
import AuthModal from '@/components/AuthModal.vue'

const router = useRouter()
const route = useRoute()
const { isAuthenticated } = useAuth()

const showAuthModal = ref(false)
const pendingRoute = ref(null)

const checkLoginQuery = () => {
  if (route.query.login === 'true' && !isAuthenticated.value) {
    if (route.query.redirect) {
      pendingRoute.value = route.query.redirect
    }
    showAuthModal.value = true
  }
}

onMounted(() => {
  checkLoginQuery()
})

watch(() => route.query.login, () => {
  checkLoginQuery()
})

const handleToolNavigate = (path) => {
  if (isAuthenticated.value) {
    router.push(path)
  } else {
    pendingRoute.value = path
    showAuthModal.value = true
  }
}

const onAuthSuccess = () => {
  showAuthModal.value = false
  if (pendingRoute.value) {
    const routeToPush = pendingRoute.value
    pendingRoute.value = null
    router.push(routeToPush)
  } else if (route.query.login) {
    router.replace({ path: '/' })
  }
}

const scrollToEditor = () => {
  window.scrollTo({ top: 350, behavior: 'smooth' })
}
</script>

<style scoped>
.home-page-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 36px 24px 60px 24px;
}

/* =========================================================================
   HERO SECTION
   ========================================================================= */
.hero-section {
  margin-bottom: 36px;
}

.hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  position: relative;
}

.hero-text-block {
  flex: 1;
  max-width: 680px;
}

.hero-title {
  font-size: 52px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 16px 0;
}

.title-primary {
  color: var(--text-main);
}

.title-gradient {
  background: linear-gradient(135deg, #818cf8 0%, #a855f7 60%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

.hero-description {
  font-size: 16.5px;
  line-height: 1.6;
  color: var(--text-sub);
  margin: 0 0 24px 0;
  max-width: 580px;
}

/* Feature Pills Bar */
.hero-features-bar {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 10px 18px;
  border-radius: 40px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  flex-wrap: wrap;
}

.feature-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.feature-badge:hover {
  color: var(--accent-indigo);
  transform: translateY(-1px);
}

.feat-icon {
  font-size: 14px;
}

.feat-divider {
  color: var(--card-border);
  font-size: 13px;
  user-select: none;
}

/* =========================================================================
   HERO 3D TAMIL ILLUSTRATION
   ========================================================================= */
.hero-art-block {
  flex: 0 0 340px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.art-composition {
  position: relative;
  width: 280px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Ambient Radial Glow */
.aura-glow {
  position: absolute;
  width: 260px;
  height: 180px;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.35) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 75%);
  filter: blur(24px);
  z-index: 1;
}

/* Soft Cloud Backdrop */
.cloud-backdrop {
  position: absolute;
  width: 220px;
  height: 130px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.15));
  border-radius: 50% 50% 45% 45% / 60% 60% 40% 40%;
  filter: blur(12px);
  z-index: 2;
}

/* Central Neon Card with 'அ' */
.central-tamil-card {
  position: relative;
  z-index: 5;
  width: 96px;
  height: 96px;
  background: linear-gradient(145deg, #1e1b4b, #312e81);
  border-radius: 24px;
  border: 2px solid rgba(168, 85, 247, 0.6);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: floatMain 4s ease-in-out infinite;
}

:root.light .central-tamil-card {
  background: linear-gradient(145deg, #4338ca, #6366f1);
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 16px 36px rgba(99, 102, 241, 0.35);
}

.tamil-char-hero {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 50px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* Floating Mini Orbs */
.floating-orb {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(49, 46, 129, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #c7d2fe;
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}

:root.light .floating-orb {
  background: rgba(238, 242, 255, 0.85);
  border: 1px solid rgba(129, 140, 248, 0.4);
  color: #4338ca;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.15);
}

.orb-tha {
  top: 15px;
  left: 20px;
  animation: floatOrb1 5s ease-in-out infinite;
}

.orb-m {
  bottom: 30px;
  right: 15px;
  animation: floatOrb2 4.5s ease-in-out infinite;
}

/* Sparkles & Rays */
.sparkle-star {
  position: absolute;
  color: #c084fc;
  font-size: 16px;
  z-index: 6;
  animation: pulseStar 3s ease-in-out infinite;
}

.star-1 {
  top: 10px;
  right: 50px;
}

.star-2 {
  bottom: 15px;
  left: 50px;
  font-size: 12px;
}

.sparkle-dash {
  position: absolute;
  width: 14px;
  height: 2px;
  background: #818cf8;
  border-radius: 2px;
  z-index: 3;
}

.dash-1 {
  top: 60px;
  left: 0;
  transform: rotate(-35deg);
}

.dash-2 {
  bottom: 60px;
  left: 10px;
  transform: rotate(25deg);
}

.dash-3 {
  top: 25px;
  right: 10px;
  width: 18px;
  transform: rotate(45deg);
}

@keyframes floatMain {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

@keyframes floatOrb1 {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(4deg); }
}

@keyframes floatOrb2 {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(8px) rotate(-4deg); }
}

@keyframes pulseStar {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* =========================================================================
   WORKSPACE GRID (EDITOR + AI TOOLS)
   ========================================================================= */
.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}

/* Left: Tanglish Editor Container */
.editor-column {
  min-width: 0;
}

.editor-outer-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: all 0.25s ease;
}

.editor-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.editor-header-badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 19px;
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
}

.editor-header-titles {
  flex: 1;
}

.card-main-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 4px 0;
}

.card-subtitle {
  font-size: 13.5px;
  color: var(--text-sub);
  margin: 0;
}

.editor-component-wrapper {
  border-radius: 14px;
  overflow: hidden;
}

/* Right: AI Tools Panel */
.ai-tools-column {
  min-width: 0;
}

.ai-tools-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tools-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sparkle-badge {
  color: #818cf8;
  font-size: 18px;
}

.tools-header-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.tools-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Tool Feature Item Cards */
.tool-feature-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  user-select: none;
}

.tool-feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.tool-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tool-svg {
  width: 22px;
  height: 22px;
}

.tool-content {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 14.5px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.tool-desc {
  font-size: 12.5px;
  line-height: 1.4;
  margin: 0;
}

.tool-arrow {
  font-size: 20px;
  font-weight: 400;
  line-height: 1;
  transition: transform 0.2s;
}

.tool-feature-item:hover .tool-arrow {
  transform: translateX(4px);
}

/* Theme 0: Tamil Documents & Notes */
.docs-theme {
  background: #f0fdf4;
  border-color: #dcfce7;
}
.docs-theme .tool-icon-box {
  background: #dcfce7;
  color: #10b981;
}
.docs-theme .tool-name {
  color: #064e3b;
}
.docs-theme .tool-desc {
  color: #047857;
}
.docs-theme .tool-arrow {
  color: #10b981;
}

/* Theme 1: OCR Text Extraction */
.ocr-theme {
  background: #f5f3ff;
  border-color: #ede9fe;
}
.ocr-theme .tool-icon-box {
  background: #ede9fe;
  color: #7c3aed;
}
.ocr-theme .tool-name {
  color: #1e1b4b;
}
.ocr-theme .tool-desc {
  color: #5b21b6;
}
.ocr-theme .tool-arrow {
  color: #7c3aed;
}

/* Theme 2: Audio Transcription */
.audio-theme {
  background: #eff6ff;
  border-color: #dbeafe;
}
.audio-theme .tool-icon-box {
  background: #dbeafe;
  color: #2563eb;
}
.audio-theme .tool-name {
  color: #172554;
}
.audio-theme .tool-desc {
  color: #1d4ed8;
}
.audio-theme .tool-arrow {
  color: #2563eb;
}

/* Theme 3: Tamil Blog & SEO */
.blog-theme {
  background: #f0fdf4;
  border-color: #dcfce7;
}
.blog-theme .tool-icon-box {
  background: #dcfce7;
  color: #059669;
}
.blog-theme .tool-name {
  color: #064e3b;
}
.blog-theme .tool-desc {
  color: #047857;
}
.blog-theme .tool-arrow {
  color: #059669;
}

/* Theme 4: Tamil Subtitles */
.subtitles-theme {
  background: #fdf2f8;
  border-color: #fce7f3;
}
.subtitles-theme .tool-icon-box {
  background: #fce7f3;
  color: #db2777;
}
.subtitles-theme .tool-name {
  color: #831843;
}
.subtitles-theme .tool-desc {
  color: #9d174d;
}
.subtitles-theme .tool-arrow {
  color: #db2777;
}

/* =========================================================================
   RESPONSIVE DESIGN
   ========================================================================= */
@media (max-width: 1100px) {
  .hero-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-art-block {
    align-self: center;
  }
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .home-page-container {
    padding: 20px 16px;
  }
  .hero-title {
    font-size: 38px;
  }
  .hero-features-bar {
    border-radius: 20px;
    padding: 12px 14px;
    gap: 10px;
  }
  .feat-divider {
    display: none;
  }
  .editor-outer-card {
    padding: 16px;
  }
}
</style>