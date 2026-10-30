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
            <button 
              type="button" 
              class="feature-chip active-chip" 
              @click="scrollToEditor"
              title="Tanglish to Tamil Editor"
            >
              <span class="chip-brand-badge" title="Tanglish to Tamil">
                <span class="badge-ta">அ</span>
                <span class="badge-en">A</span>
              </span>
              <span class="chip-label">Tanglish to Tamil</span>
            </button>

            <button 
              type="button" 
              class="feature-chip" 
              @click="handleToolNavigate('/editor')"
              title="Tamil Documents & Notes"
            >
              <span class="chip-icon-box docs-icon-box">
                <svg class="chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </span>
              <span class="chip-label">Tamil Documents</span>
            </button>

            <button 
              type="button" 
              class="feature-chip" 
              @click="handleToolNavigate('/ocr')"
              title="OCR Text Extraction"
            >
              <span class="chip-icon-box ocr-icon-box">
                <svg class="chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2M16 20h2a2 2 0 0 0 2-2v-2" stroke-linecap="round"/>
                  <rect x="8" y="8" width="8" height="8" rx="2"/>
                </svg>
              </span>
              <span class="chip-label">OCR</span>
            </button>

            <button 
              type="button" 
              class="feature-chip" 
              @click="handleToolNavigate('/audio')"
              title="Audio Transcription"
            >
              <span class="chip-icon-box audio-icon-box">
                <svg class="chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </span>
              <span class="chip-label">Audio Transcription</span>
            </button>

            <button 
              type="button" 
              class="feature-chip" 
              @click="handleToolNavigate('/subtitle')"
              title="Tamil Subtitles"
            >
              <span class="chip-icon-box sub-icon-box">
                <svg class="chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <line x1="6" y1="15" x2="10" y2="15"/>
                  <line x1="14" y1="15" x2="18" y2="15"/>
                  <line x1="6" y1="11" x2="18" y2="11"/>
                </svg>
              </span>
              <span class="chip-label">Subtitles</span>
            </button>
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
              <div class="editor-header-badge" title="Tanglish to Tamil">
                <div class="aa-mark-container">
                  <span class="aa-mark-ta">அ</span>
                  <span class="aa-mark-en">A</span>
                </div>
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
  max-width: 740px;
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

/* Feature Chips Bar */
.hero-features-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  padding: 6px 12px 6px 8px;
  border-radius: 24px;
  box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub, #475569);
  text-decoration: none;
  user-select: none;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.feature-chip:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  color: var(--accent-indigo, #4f46e5);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.12);
}

/* Active Chip Highlight for Tanglish to Tamil (the primary hero tool) */
.feature-chip.active-chip {
  background: #f5f3ff;
  border-color: #c7d2fe;
  color: #4338ca;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
}

.feature-chip.active-chip:hover {
  border-color: #a5b4fc;
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.2);
}

/* ── Chip Micro-Icon Badges ── */
.chip-brand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1.5px;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #7c3aed 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.4);
  line-height: 1;
  user-select: none;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.feature-chip:hover .chip-brand-badge {
  transform: scale(1.08);
}

.chip-brand-badge .badge-ta {
  font-family: 'Noto Sans Tamil', -apple-system, sans-serif;
  font-size: 11.5px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.chip-brand-badge .badge-en {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 9.5px;
  font-weight: 800;
  color: #c7d2fe;
  line-height: 1;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.chip-icon-box {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.feature-chip:hover .chip-icon-box {
  transform: scale(1.08);
}

.chip-svg {
  width: 13.5px;
  height: 13.5px;
}

.docs-icon-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #10b981;
}

.ocr-icon-box {
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  color: #7c3aed;
}

.audio-icon-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
}

.sub-icon-box {
  background: #fdf2f8;
  border: 1px solid #fbcfe8;
  color: #db2777;
}

.chip-label {
  line-height: 1;
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
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 45%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px -2px rgba(79, 70, 229, 0.38), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.28);
  position: relative;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.editor-header-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%);
  border-top-left-radius: 13px;
  border-top-right-radius: 13px;
  pointer-events: none;
}

.editor-outer-card:hover .editor-header-badge {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 12px 28px -2px rgba(79, 70, 229, 0.48), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
}

.aa-mark-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2.5px;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.aa-mark-ta {
  font-family: 'Noto Sans Tamil', -apple-system, sans-serif;
  font-size: 21px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  letter-spacing: -0.02em;
}

.aa-mark-en {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #bfdbfe;
  line-height: 1;
  letter-spacing: -0.03em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
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
  height: 520px;
  flex-shrink: 0;
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
    padding: 16px 12px;
  }
  .hero-section {
    padding: 24px 0 16px 0;
  }
  .hero-title {
    font-size: 34px;
    text-align: center;
  }
  .hero-description {
    text-align: center;
    font-size: 14.5px;
    margin: 12px auto 18px auto;
  }
  .hero-text-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  .hero-features-bar {
    gap: 8px;
    justify-content: center;
  }
  .feature-chip {
    padding: 5px 12px 5px 8px;
    font-size: 12px;
  }
  .hero-art-block {
    align-self: center;
    transform: scale(0.85);
    margin: -10px 0 10px 0;
  }
  .editor-outer-card {
    padding: 12px 10px;
    border-radius: 16px;
  }
  .editor-header-titles {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .home-page-container {
    padding: 12px 8px;
  }
  .hero-title {
    font-size: 28px;
    line-height: 1.18;
  }
  .hero-art-block {
    transform: scale(0.72);
    margin: -25px 0 0 0;
  }
  .feature-badge {
    padding: 4px 8px;
    font-size: 12px;
  }
  .card-main-title {
    font-size: 16.5px;
  }
  .card-subtitle {
    font-size: 12px;
  }
  .editor-outer-card {
    padding: 8px 6px;
    border-radius: 12px;
  }
  .tool-feature-item {
    padding: 12px;
    border-radius: 12px;
  }
  .tool-name {
    font-size: 14px;
  }
  .tool-desc {
    font-size: 12px;
  }
}
</style>