<template>
  <div id="app" class="light-mode">
    <NavBar />
    <router-view />
  </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import { useTheme } from '@/composables/useTheme'

const { theme } = useTheme()
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');

:root, :root.light, [data-theme="light"] {
  --app-bg: #f8fafc;
  --app-bg-radial: radial-gradient(circle at 85% 15%, rgba(99, 102, 241, 0.08), transparent 45%), radial-gradient(circle at 10% 85%, rgba(147, 197, 253, 0.08), transparent 45%);
  --nav-bg: rgba(255, 255, 255, 0.85);
  --nav-border: #e2e8f0;
  --card-bg: #ffffff;
  --card-border: #e2e8f0;
  --card-hover-border: #c7d2fe;
  --card-inner-bg: #ffffff;
  --card-inner-border: #e2e8f0;
  --toolbar-bg: #f8fafc;
  --toolbar-btn-bg: #ffffff;
  --toolbar-btn-hover: #f1f5f9;
  --toolbar-btn-active: #e0e7ff;
  --toolbar-border: #e2e8f0;
  --text-main: #0f172a;
  --text-sub: #475569;
  --text-muted: #94a3b8;
  --accent-purple: #8b5cf6;
  --accent-indigo: #4f46e5;
  --credits-bg: #f5f3ff;
  --credits-border: #e0e7ff;
  --credits-text: #4f46e5;
  --btn-primary-bg: #4f46e5;
  --btn-primary-hover: #4338ca;
  --scrollbar-track: #f1f5f9;
  --scrollbar-thumb: #cbd5e1;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow-x: hidden;
  background-color: var(--app-bg);
  color: var(--text-main);
  transition: background-color 0.25s ease, color 0.25s ease;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-image: var(--app-bg-radial);
  background-attachment: fixed;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Global scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Global utility classes */
.text-center {
  text-align: center;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
}
</style>