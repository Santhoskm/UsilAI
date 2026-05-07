<template>
  <div v-if="isOpen" class="auth-modal-overlay" @click.self="closeModal">
    <div class="auth-modal">
      <button class="close-btn" @click="closeModal">×</button>
      
      <div class="auth-tabs">
        <button 
          @click="switchTab('login')" 
          :class="{ active: activeTab === 'login' }"
          class="tab-btn"
        >
          Login
        </button>
        <button 
          @click="switchTab('signup')" 
          :class="{ active: activeTab === 'signup' }"
          class="tab-btn"
        >
          Sign Up
        </button>
      </div>

      <!-- Login Form -->
      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>Email</label>
          <input 
            type="email" 
            v-model="loginForm.email" 
            required
            placeholder="demo@usil.ai"
            class="auth-input"
            :disabled="isLoading"
          />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input 
            type="password" 
            v-model="loginForm.password" 
            required
            placeholder="••••••"
            class="auth-input"
            :disabled="isLoading"
          />
        </div>
        
        <div v-if="error" class="error-message">
          ⚠️ {{ error }}
        </div>
        
        <div class="demo-credentials">
          <p>Demo Credentials:</p>
          <code>Email: demo@usil.ai</code>
          <code>Password: demo123</code>
        </div>
        
        <button type="submit" :disabled="isLoading" class="submit-btn">
          <span v-if="!isLoading">Login</span>
          <span v-else>
            <span class="spinner"></span>
            Logging in...
          </span>
        </button>
      </form>

      <!-- Signup Form -->
      <form v-if="activeTab === 'signup'" @submit.prevent="handleSignup" class="auth-form">
        <div class="form-group">
          <label>Full Name</label>
          <input 
            type="text" 
            v-model="signupForm.name" 
            required
            placeholder="Your name"
            class="auth-input"
            :disabled="isLoading"
          />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input 
            type="email" 
            v-model="signupForm.email" 
            required
            placeholder="you@example.com"
            class="auth-input"
            :disabled="isLoading"
          />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input 
            type="password" 
            v-model="signupForm.password" 
            required
            placeholder="Create a password"
            class="auth-input"
            :disabled="isLoading"
          />
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input 
            type="password" 
            v-model="signupForm.confirmPassword" 
            required
            placeholder="Confirm password"
            class="auth-input"
            :disabled="isLoading"
          />
        </div>
        
        <div v-if="error" class="error-message">
          ⚠️ {{ error }}
        </div>
        
        <button type="submit" :disabled="isLoading" class="submit-btn">
          <span v-if="!isLoading">Create Account</span>
          <span v-else>
            <span class="spinner"></span>
            Creating...
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])

const { login, signup, isLoading, error } = useAuth()

const activeTab = ref('login')
const loginForm = ref({ email: '', password: '' })
const signupForm = ref({ name: '', email: '', password: '', confirmPassword: '' })

// Reset forms when modal opens/closes or tab changes
const resetForms = () => {
  loginForm.value = { email: '', password: '' }
  signupForm.value = { name: '', email: '', password: '', confirmPassword: '' }
  error.value = null
}

const switchTab = (tab) => {
  activeTab.value = tab
  resetForms()
}

const handleLogin = async () => {
  const result = await login(loginForm.value.email, loginForm.value.password)
  if (result.success) {
    resetForms()
    emit('success', result.user)
    emit('close')
  }
}

const handleSignup = async () => {
  if (signupForm.value.password !== signupForm.value.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }
  if (signupForm.value.password.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  
  const result = await signup(signupForm.value.name, signupForm.value.email, signupForm.value.password)
  if (result.success) {
    resetForms()
    emit('success', result.user)
    emit('close')
  }
}

const closeModal = () => {
  resetForms()
  emit('close')
}

// Watch for modal open to reset forms
watch(() => props.isOpen, (newVal) => {
  if (!newVal) {
    resetForms()
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.auth-modal {
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 460px;
  padding: 32px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 24px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  color: #333;
  background: #f0f0f0;
}

.auth-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  color: #666;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.auth-input {
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
}

.auth-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.auth-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.demo-credentials {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 10px;
  font-size: 12px;
  text-align: center;
}

.demo-credentials p {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: #666;
}

.demo-credentials code {
  display: block;
  font-size: 11px;
  color: #667eea;
  margin: 4px 0;
}

.error-message {
  background: #fee;
  color: #e74c3c;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.submit-btn {
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .auth-modal {
    padding: 24px;
    width: 95%;
  }
}
</style>