<template>
  <div class="page-container">
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        ← Back to Home
      </button>
      <div class="header-content">
        <h1>Tamil Blog Generator</h1>
        <p>Generate SEO-optimized Tamil blog posts with AI</p>
      </div>
    </div>
    <div class="page-content">
      <TamilBlogGenerator @blog-generated="handleBlogGenerated" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import TamilBlogGenerator from '@/components/TamilBlogGenerator.vue'

const router = useRouter()

const goBack = () => {
  router.push('/')
}

const handleBlogGenerated = (data) => {
  console.log('Blog generated:', data)
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f8f9fa;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 32px;
  color: white;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 24px;
  left: 32px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.header-content {
  text-align: center;
}

.header-content h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.header-content p {
  font-size: 16px;
  opacity: 0.9;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
}

@media (max-width: 768px) {
  .page-header {
    padding: 20px 16px;
  }
  
  .back-btn {
    position: static;
    margin-bottom: 16px;
  }
  
  .header-content h1 {
    font-size: 24px;
  }
  
  .page-content {
    padding: 16px;
  }
}
</style>