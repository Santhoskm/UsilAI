<template>
  <Teleport to="body">
    <div v-if="isOpen" class="auth-modal-overlay" @click.self="closeModal">
      <div class="auth-modal">
        <button class="close-btn" @click="closeModal" aria-label="Close">×</button>

        <div class="modal-badge-wrapper">
          <div class="modal-badge-icon">
            <svg class="google-svg" width="30" height="30" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>
        </div>

        <div class="modal-header">
          <h2 class="modal-title">{{ title || 'Sign in to Usil AI' }}</h2>
          <p class="modal-subtitle">
            {{ subtitle || 'Continue with your Google account to access OCR, Audio transcription, and all AI features.' }}
          </p>
        </div>

        <!-- Google Sign In Button Container -->
        <div class="google-auth-wrapper">
          <div ref="googleModalBtnRef" class="google-btn-container"></div>
        </div>

        <div v-if="error" class="error-message">
          ⚠️ {{ error }}
        </div>

        <!-- Benefits Card -->
        <div class="features-unlocked-card">
          <div class="card-caption">All features unlocked with Google:</div>
          <ul class="features-list">
            <li>
              <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span>Tamil OCR image-to-text extraction</span>
            </li>
            <li>
              <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span>Tamil voice & audio transcription</span>
            </li>
            <li>
              <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span>AI Blog and Subtitle generators</span>
            </li>
          </ul>
        </div>

        <div class="modal-footer-note">
          🔒 Fast, secure 1-click login powered by Google Identity
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useGoogleAuth } from '@/composables/useGoogleAuth'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Sign in to Usil AI'
  },
  subtitle: {
    type: String,
    default: 'Continue with your Google account to access OCR, Audio transcription, and all AI features.'
  }
})

const emit = defineEmits(['close', 'success'])

const { error } = useAuth()
const { initAndRender } = useGoogleAuth()

const googleModalBtnRef = ref(null)

const handleGoogleSuccess = (user) => {
  emit('success', user)
  emit('close')
}

const renderGoogleButton = async () => {
  await nextTick()
  if (googleModalBtnRef.value) {
    initAndRender(googleModalBtnRef.value, handleGoogleSuccess, {
      width: 320,
      theme: 'outline',
      shape: 'pill',
      text: 'continue_with'
    })
  }
}

const closeModal = () => {
  emit('close')
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    renderGoogleButton()
  }
})
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
  padding: 20px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.auth-modal {
  background: var(--card-bg, white);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 28px;
  width: 90%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 36px 32px 30px;
  position: relative;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #f1f5f9;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  line-height: 1;
}

.close-btn:hover {
  color: #0f172a;
  background: #e2e8f0;
}

.modal-badge-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.modal-badge-icon {
  width: 60px;
  height: 60px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.modal-header {
  margin-bottom: 24px;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  font-size: 14px;
  color: var(--text-sub, #64748b);
  margin: 0;
  line-height: 1.5;
}

.google-auth-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px;
  min-height: 44px;
}

.google-btn-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 44px;
}

.error-message {
  background: #fef2f2;
  color: #ef4444;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 16px;
  border: 1px solid #fee2e2;
}

.features-unlocked-card {
  background: var(--card-inner-bg, #f8fafc);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 20px;
  text-align: left;
}

.card-caption {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #64748b);
  margin-bottom: 12px;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-sub, #334155);
  font-weight: 500;
}

.check-icon {
  width: 16px;
  height: 16px;
  color: #10b981;
  flex-shrink: 0;
}

.modal-footer-note {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

@media (max-width: 480px) {
  .auth-modal {
    padding: 28px 20px 24px;
    width: 92%;
  }
}
</style>