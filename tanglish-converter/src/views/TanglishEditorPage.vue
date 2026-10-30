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
          <div class="brand-avatar" title="Tamil Document Editor">
            <span class="brand-char-ta">அ</span>
            <span class="brand-char-en">A</span>
          </div>
          <div class="brand-text">
            <h1 class="workspace-title">Tamil Document Editor</h1>
            <span class="workspace-subtitle">Multi-File Cloud Notes & Typist</span>
          </div>
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
  height: calc(100vh - 65px);
  max-height: calc(100vh - 65px);
  display: flex;
  flex-direction: column;
  background: var(--app-bg, #f8fafc);
  padding: 8px 16px 12px 16px;
  overflow: hidden;
  box-sizing: border-box;
}

.workspace-top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 8px 8px;
  background: transparent;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
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
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.28);
  position: relative;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.brand-avatar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%);
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  pointer-events: none;
}

.brand-avatar:hover {
  transform: translateY(-1.5px) scale(1.05);
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.42), inset 0 1px 1px rgba(255, 255, 255, 0.5);
}

.brand-char-ta {
  font-family: 'Noto Sans Tamil', -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 1;
}

.brand-char-en {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 12.5px;
  font-weight: 800;
  color: #bfdbfe;
  line-height: 1;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
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

.sync-text-short {
  display: none;
}

.docs-canvas-container {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}

@media (max-width: 768px) {
  .docs-workspace-page {
    padding: 4px 6px 6px 6px;
    height: calc(100vh - 58px);
    height: calc(100dvh - 58px);
    max-height: calc(100dvh - 58px);
  }
  .workspace-top-header {
    padding: 2px 4px 6px 4px;
    gap: 8px;
    flex-wrap: nowrap;
  }
  .header-left {
    gap: 8px;
  }
  .back-home-btn {
    padding: 5px 10px;
    font-size: 12px;
  }
  .brand-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    gap: 1px;
  }
  .brand-char-ta {
    font-size: 13px;
  }
  .brand-char-en {
    font-size: 10px;
  }
  .workspace-title {
    font-size: 14.5px;
  }
  .workspace-subtitle {
    display: none;
  }
  .sync-text-full {
    display: none;
  }
  .sync-text-short {
    display: inline;
  }
  .cloud-sync-badge {
    padding: 4px 10px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .workspace-title {
    font-size: 13.5px;
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cloud-sync-badge {
    padding: 3px 8px;
    font-size: 10.5px;
  }
}
</style>