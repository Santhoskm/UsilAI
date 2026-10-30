<template>
  <div class="tool-page-container">
    <div class="tool-page-header">
      <router-link to="/" class="back-pill-btn">
        <span class="back-arrow">←</span>
        <span>Back to Home</span>
      </router-link>

      <div class="tool-header-content">
        <div class="tool-badge-pill sub-badge">
          <span class="badge-icon">🎬</span>
          <span>SRT & VTT Subtitles</span>
        </div>
        <h1 class="tool-page-title">
          <span class="title-primary">Tamil Subtitle</span>
          <span class="title-gradient">Generator</span>
        </h1>
        <p class="tool-page-subtitle">
          Create, edit, and sync professional Tamil video subtitles with AI grammar checks and instant SRT/VTT exports.
        </p>
      </div>
    </div>

    <div class="tool-page-body">
      <TamilSubtitleGenerator @subtitles-generated="handleSubtitlesGenerated" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import TamilSubtitleGenerator from '@/components/TamilSubtitleGenerator.vue'

const router = useRouter()

const handleSubtitlesGenerated = (data) => {
  console.log('Subtitles generated:', data)
}
</script>

<style scoped>
.tool-page-container {
  max-width: 1350px;
  margin: 0 auto;
  padding: 36px 24px 60px 24px;
}

.tool-page-header {
  margin-bottom: 32px;
}

.back-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--toolbar-btn-bg);
  border: 1px solid var(--toolbar-border);
  color: var(--text-sub);
  padding: 8px 16px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 600;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.back-pill-btn:hover {
  color: var(--text-main);
  background: var(--toolbar-btn-hover);
  transform: translateX(-2px);
}

.back-arrow {
  font-size: 15px;
}

.tool-header-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sub-badge {
  background: #fce7f3;
  border: 1px solid #fbcfe8;
  color: #be185d;
}

.tool-page-title {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin: 0;
}

.title-primary {
  color: var(--text-main);
  margin-right: 10px;
}

.title-gradient {
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tool-page-subtitle {
  font-size: 15.5px;
  color: var(--text-sub);
  margin: 0;
  max-width: 650px;
  line-height: 1.5;
}

.tool-page-body {
  width: 100%;
}

@media (max-width: 768px) {
  .tool-page-container {
    padding: 16px 14px 40px 14px;
  }
  .tool-page-title {
    font-size: 28px;
  }
  .tool-page-subtitle {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .tool-page-container {
    padding: 12px 10px 32px 10px;
  }
  .tool-page-title {
    font-size: 24px;
  }
  .back-pill-btn {
    padding: 6px 12px;
    font-size: 12.5px;
    margin-bottom: 14px;
  }
}
</style>