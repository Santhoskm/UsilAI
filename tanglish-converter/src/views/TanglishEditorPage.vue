<template>
  <div class="docs-workspace-page">
    <!-- Top Workspace Header (Clean & Minimal like Desh Tamil / Google Docs) -->
    <header class="workspace-top-header">
      <div class="header-left">
        <router-link to="/" class="back-home-btn" title="Return to Usil AI Home">
          <span class="back-arrow">←</span>
          <span>Home</span>
        </router-link>
        <div class="workspace-brand">
          <div class="brand-avatar">文A</div>
          <div class="brand-text">
            <h1 class="workspace-title">Tamil Document Editor</h1>
            <span class="workspace-subtitle">Multi-File Cloud Notes & Typist</span>
          </div>
        </div>
      </div>

      <div class="header-right">
        <div class="cloud-sync-badge" title="All changes saved permanently to your PostgreSQL database">
          <span class="sync-indicator"></span>
          <span>PostgreSQL Cloud Sync (5 files max)</span>
        </div>
      </div>
    </header>

    <!-- Main Full-Page Document Canvas (Matching Image 3 layout) -->
    <main class="docs-canvas-container">
      <TanglishEditor :enableSidebar="true" :fullPage="true" />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import TanglishEditor from '@/components/TanglishEditor.vue'

const router = useRouter()
</script>

<style scoped>
.docs-workspace-page {
  width: 100%;
  min-height: calc(100vh - 72px);
  display: flex;
  flex-direction: column;
  background: var(--app-bg, #f8fafc);
  padding: 12px 20px 24px 20px;
}

.workspace-top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 14px 16px;
  background: transparent;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid var(--card-border, #e2e8f0);
  color: var(--text-sub, #475569);
  padding: 7px 14px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 600;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.back-home-btn:hover {
  background: #f1f5f9;
  color: var(--text-main, #0f172a);
  border-color: #cbd5e1;
  transform: translateX(-2px);
}

.back-arrow {
  font-size: 14px;
}

.workspace-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-avatar {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #ffffff;
  font-weight: 800;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
}

.workspace-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  margin: 0;
  line-height: 1.2;
}

.workspace-subtitle {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cloud-sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(22, 101, 52, 0.04);
}

.sync-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
}

.docs-canvas-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 16px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

@media (max-width: 768px) {
  .docs-workspace-page {
    padding: 8px 8px 16px 8px;
  }
  .workspace-top-header {
    padding: 6px 8px 10px 8px;
  }
}
</style>