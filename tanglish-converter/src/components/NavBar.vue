<template>
  <nav class="nav-bar">
    <div class="nav-container">
      <!-- Logo -->
      <a class="logo" href="/">
        <span class="logo-text">Usil AI</span>
      </a>

      <!-- Desktop Navigation Links - Only show when logged in -->
      <div class="nav-links" v-if="isAuthenticated">
        <a href="/" class="nav-link">Home</a>
        <a href="/editor" class="nav-link">Tanglish Editor</a>
        <a href="/ocr" class="nav-link">OCR</a>
        <a href="/audio" class="nav-link">Audio to Text</a>
        <a href="/blog" class="nav-link">Blog Generator</a>
        <a href="/subtitle" class="nav-link">Subtitle Generator</a>
      </div>

      <!-- Right Section -->
      <div class="nav-right">
        <!-- Free Counter (only when logged in) -->
        <div  class="free-counter">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
          </svg>
          <span class="counter-value">50</span>
          <span class="counter-label">/day</span>
        </div>

        <!-- User Menu (Logged In) -->
        <div v-if="isAuthenticated" class="user-menu">
          <button class="user-avatar" @click="toggleUserMenu">
            <span class="avatar-initial">{{ userInitial }}</span>
          </button>
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="user-info">
              <div class="user-name">{{ user?.name }}</div>
              <div class="user-email">{{ user?.email }}</div>
            </div>
            <hr class="dropdown-divider">
            <button @click="handleLogout" class="logout-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        </div>

        <!-- Auth Buttons (Logged Out) - Compact version -->
        <div v-else class="auth-buttons">
          <button class="login-btn" @click="openLoginModal">
            Log in
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- Mobile Menu Button -->
        <button class="mobile-menu-btn" @click="toggleMobileMenu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="mobileMenuOpen" class="mobile-menu">
      <a href="/" class="mobile-nav-link" @click="closeMobileMenu">Home</a>
      <a href="/editor" class="mobile-nav-link" @click="closeMobileMenu">Tanglish Editor</a>
      <template v-if="isAuthenticated">
        <a href="/ocr" class="mobile-nav-link" @click="closeMobileMenu">OCR</a>
        <a href="/audio" class="mobile-nav-link" @click="closeMobileMenu">Audio to Text</a>
        <a href="/blog" class="mobile-nav-link" @click="closeMobileMenu">Blog Generator</a>
        <a href="/subtitle" class="mobile-nav-link" @click="closeMobileMenu">Subtitle Generator</a>
        <hr class="mobile-divider">
        <button class="mobile-logout-btn" @click="handleMobileLogout">Logout</button>
      </template>
      <template v-else>
        <button class="mobile-login-btn" @click="handleMobileLogin">Login</button>
      </template>
    </div>

    <!-- Auth Modal -->
    <AuthModal 
      :isOpen="showAuthModal" 
      @close="closeAuthModal"
      @success="onLoginSuccess"
    />
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import AuthModal from './AuthModal.vue'

const router = useRouter()
const route = useRoute()
const { user, isAuthenticated, logout } = useAuth()

const showAuthModal = ref(false)
const showUserMenu = ref(false)
const mobileMenuOpen = ref(false)
const freeCount = ref(0)

const userInitial = computed(() => {
  if (user.value?.name) {
    return user.value.name.charAt(0).toUpperCase()
  }
  if (user.value?.email) {
    return user.value.email.charAt(0).toUpperCase()
  }
  return 'U'
})

// Load free count when authenticated (static for now)
const loadFreeCount = () => {
  freeCount.value = 50
}

const openLoginModal = () => {
  showAuthModal.value = true
}

const closeAuthModal = () => {
  showAuthModal.value = false
}

const onLoginSuccess = async () => {
  closeAuthModal()
  closeMobileMenu()
  
  // Refresh the page to update all components
  window.location.reload()
}

const handleLogout = async () => {
  await logout()
  closeMobileMenu()
  showUserMenu.value = false
  
  // Refresh the page to clear all states and redirect to home
  window.location.href = '/'
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

const handleMobileLogout = async () => {
  await logout()
  closeMobileMenu()
  window.location.href = '/'
}

const handleMobileLogin = () => {
  closeMobileMenu()
  openLoginModal()
}

// Close user menu when clicking outside
const handleClickOutside = (event) => {
  const userMenu = document.querySelector('.user-menu')
  if (userMenu && !userMenu.contains(event.target)) {
    showUserMenu.value = false
  }
}

// Watch for authentication changes
watch(isAuthenticated, (newVal) => {
  freeCount.value = newVal ? 50 : 0
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  loadFreeCount()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.nav-bar {
  position: sticky;
  top: 16px;
  z-index: 1000;
  width: 100%;
  padding: 0 16px;
  box-sizing: border-box;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 100px;
  padding: 8px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
  transition: all 0.3s ease;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.logo-text {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #1a1a2e 0%, #667eea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

/* Navigation Links - Only visible when logged in */
.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.nav-link {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  text-decoration: none;
  border-radius: 100px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f5f5f5;
  color: #333;
}

/* Right Section */
.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.free-counter {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 100px;
  color: #667eea;
  font-size: 13px;
  font-weight: 600;
}

.counter-value {
  font-size: 15px;
  font-weight: 700;
}

.counter-label {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.7;
}

/* Auth Buttons - Compact */
.auth-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* User Menu */
.user-menu {
  position: relative;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar:hover {
  transform: scale(1.05);
}

.avatar-initial {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 12px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 240px;
  overflow: hidden;
  animation: dropdownSlide 0.2s ease;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-info {
  padding: 16px;
  background: #f8f9fa;
}

.user-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.user-email {
  font-size: 12px;
  color: #888;
  word-break: break-all;
}

.dropdown-divider {
  margin: 0;
  border: none;
  border-top: 1px solid #eee;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  font-size: 14px;
  color: #e74c3c;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.logout-btn:hover {
  background: #fee;
}

/* Mobile Menu */
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #666;
}

.mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  margin-top: 12px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 12px;
  flex-direction: column;
  gap: 8px;
}

.mobile-nav-link {
  padding: 12px 16px;
  font-size: 15px;
  color: #333;
  text-decoration: none;
  border-radius: 12px;
  transition: background 0.2s;
  display: block;
}

.mobile-nav-link:hover {
  background: #f5f5f5;
}

.mobile-login-btn {
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  margin-top: 8px;
}

.mobile-login-btn:hover {
  opacity: 0.9;
}

.mobile-divider {
  margin: 8px 0;
  border: none;
  border-top: 1px solid #eee;
}

.mobile-logout-btn {
  padding: 12px 16px;
  background: none;
  border: none;
  font-size: 15px;
  color: #e74c3c;
  cursor: pointer;
  text-align: left;
  border-radius: 12px;
}

.mobile-logout-btn:hover {
  background: #fee;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  
  .mobile-menu-btn {
    display: block;
  }
  
  .mobile-menu {
    display: flex;
  }
  
  .free-counter {
    display: none;
  }
  
  .nav-container {
    padding: 8px 16px;
  }
  
  .logo-text {
    font-size: 18px;
  }
}

@media (min-width: 769px) {
  .mobile-menu {
    display: none !important;
  }
}

/* Compact mode for logged out state - navbar width reduces */
.nav-container:has(.auth-buttons:only-child) {
  max-width: 300px;
}

/* When not logged in, center the navbar */
.nav-bar:has(.auth-buttons) .nav-container {
  max-width: 400px;
  justify-content: space-between;
}

/* When logged in, full width navbar */
.nav-bar:has(.user-menu) .nav-container {
  max-width: 1000px;
  justify-content: space-between;
}
</style>