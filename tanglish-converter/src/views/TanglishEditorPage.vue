<template>
  <div class="tool-page-container">
    <div class="tool-page-header">
      <router-link to="/" class="back-pill-btn">
        <span class="back-arrow">←</span>
        <span>Back to Home</span>
      </router-link>

      <div class="tool-header-content">
        <div class="tool-badge-pill editor-badge">
          <span class="badge-icon">⚡</span>
          <span>Phonetic Engine</span>
        </div>
        <h1 class="tool-page-title">
          <span class="title-primary">Tanglish</span>
          <span class="title-gradient">Editor</span>
        </h1>
        <p class="tool-page-subtitle">
          Type naturally in English/Tanglish and get real-time, phonetically accurate Tamil script with rich formatting & export options.
        </p>
      </div>
    </div>

    <div class="tool-page-body">
      <TanglishEditor />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import TanglishEditor from '@/components/TanglishEditor.vue'

const router = useRouter()
</script>

<style scoped>
.tool-page-container {
  max-width: 1250px;
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

.editor-badge {
  background: #e0e7ff;
  border: 1px solid #c7d2fe;
  color: #4338ca;
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
  background: linear-gradient(135deg, #6366f1, #a855f7);
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
    padding: 20px 16px;
  }
  .tool-page-title {
    font-size: 30px;
  }
}
</style>