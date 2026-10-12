<template>
  <div class="tool-page-container">
    <div class="tool-page-header">
      <router-link to="/" class="back-pill-btn">
        <span class="back-arrow">←</span>
        <span>Back to Home</span>
      </router-link>

      <div class="tool-header-content">
        <div class="tool-badge-pill blog-badge">
          <span class="badge-icon">✍️</span>
          <span>Tamil AI Writer</span>
        </div>
        <h1 class="tool-page-title">
          <span class="title-primary">Tamil Blog</span>
          <span class="title-gradient">Generator</span>
        </h1>
        <p class="tool-page-subtitle">
          Generate SEO-optimized, culturally authentic Tamil blog posts and articles in seconds with intelligent structuring.
        </p>
      </div>
    </div>

    <div class="tool-page-body">
      <TamilBlogGenerator @blog-generated="handleBlogGenerated" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import TamilBlogGenerator from '@/components/TamilBlogGenerator.vue'

const router = useRouter()

const handleBlogGenerated = (data) => {
  console.log('Blog generated:', data)
}
</script>

<style scoped>
.tool-page-container {
  max-width: 1300px;
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

.blog-badge {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

:root.light .blog-badge,
[data-theme="light"] .blog-badge {
  background: #fef3c7;
  border-color: #fde68a;
  color: #b45309;
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
  background: linear-gradient(135deg, #f59e0b, #ec4899);
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