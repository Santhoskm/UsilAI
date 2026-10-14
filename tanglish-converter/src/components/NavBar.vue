<template>
  <nav class="nav-bar">
    <div class="nav-container">
      <!-- Logo -->
      <router-link to="/" class="logo">
        <div class="logo-mark">
          <svg viewBox="0 0 32 32" fill="none" class="logo-svg">
            <rect width="32" height="32" rx="10" fill="url(#logo-grad)"/>
            <path d="M10 9V17C10 20.3137 12.6863 23 16 23C19.3137 23 22 20.3137 22 17V9" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6366F1"/>
                <stop offset="1" stop-color="#A855F7"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="logo-text">Usil AI</span>
      </router-link>



      <!-- Right Section -->
      <div class="nav-right">
        <!-- Daily Credits Badge -->
        <div 
          class="credits-badge" 
          @click="!isAuthenticated && openLoginModal()"
          :class="{ 'clickable': !isAuthenticated }"
          :title="isAuthenticated ? 'Logged-in user: ' + creditsLeft + ' credits remaining' : '50 free words. Click to sign in for 500+ credits!'"
        >
          <span class="credits-icon">⚡</span>
          <span class="credits-text">{{ creditsLeft }} credits</span>
        </div>

        <!-- Theme Toggle (Light / Dark) -->
        <div class="theme-switch-pill" title="Switch Theme">
          <button 
            class="theme-segment" 
            :class="{ active: theme === 'light' }" 
            @click="setTheme('light')"
            aria-label="Light mode"
            title="Light Theme"
          >
            <svg class="theme-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="4.3" fill="currentColor"/>
              <line x1="12" y1="2.2" x2="12" y2="5.5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              <line x1="12" y1="18.5" x2="12" y2="21.8" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              <line x1="2.2" y1="12" x2="5.5" y2="12" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              <line x1="18.5" y1="12" x2="21.8" y2="12" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              <line x1="5.1" y1="5.1" x2="7.4" y2="7.4" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              <line x1="16.6" y1="16.6" x2="18.9" y2="18.9" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              <line x1="5.1" y1="18.9" x2="7.4" y2="16.6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              <line x1="16.6" y1="7.4" x2="18.9" y2="5.1" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
            </svg>
          </button>
          <button 
            class="theme-segment" 
            :class="{ active: theme === 'dark' }" 
            @click="setTheme('dark')"
            aria-label="Dark mode"
            title="Dark Theme"
          >
            <svg class="theme-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <!-- User Menu (Logged In ONLY) -->
        <div v-if="isAuthenticated" class="user-menu">
          <button class="user-avatar-btn" @click="toggleUserMenu" :title="user?.name || 'Account'">
            <img v-if="user?.picture" :src="user.picture" alt="Profile" class="avatar-img" />
            <span v-else class="avatar-initial">{{ userInitial }}</span>
          </button>

          <div v-if="showUserMenu" class="user-dropdown">
            <div class="user-info">
              <div class="user-name">{{ user?.name || 'Usil User' }}</div>
              <div class="user-email">{{ user?.email }}</div>
            </div>
            <div class="dropdown-divider"></div>
            <router-link to="/admin" class="dropdown-item" @click="showUserMenu = false">
              <span class="dropdown-icon">⚙️</span>
              <span>Admin Console</span>
            </router-link>
            <div class="dropdown-divider"></div>
            <button @click="handleLogout" class="dropdown-item logout-action">
              <span class="dropdown-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <!-- Mobile Menu Hamburger (for Logged In users) -->
        <button v-if="isAuthenticated" class="mobile-toggle-btn" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div v-if="mobileMenuOpen && isAuthenticated" class="mobile-drawer">
      <div class="mobile-auth-wrapper">
        <router-link to="/admin" class="mobile-link" @click="mobileMenuOpen = false">Admin Console</router-link>
        <button @click="handleLogout" class="mobile-link logout-link">Logout</button>
      </div>
    </div>

    <!-- Google Auth Modal -->
    <AuthModal 
      :isOpen="showAuthModal || showCreditLimitModal" 
      :title="!isAuthenticated && isOutOfCredits ? '50 Free Words Limit Reached' : 'Sign in to Usil AI'"
      :subtitle="!isAuthenticated && isOutOfCredits ? 'You have used your 50 free words. Sign in with Google to get 500+ credits and continue typing!' : 'Continue with your Google account to access OCR, Audio transcription, and all AI features.'"
      @close="closeAuthModal"
      @success="onLoginSuccess"
    />

    <!-- About Usil AI Modal -->
    <div v-if="showAboutModal" class="about-modal-overlay" @click.self="showAboutModal = false">
      <div class="about-modal-card">
        <button class="about-close-btn" @click="showAboutModal = false">×</button>
        <div class="about-header">
          <div class="about-icon">✨</div>
          <h3>About Usil AI</h3>
          <p class="about-tagline">Next-Generation Tamil Content & Language Platform</p>
        </div>
        <div class="about-content">
          <p>
            Usil AI empowers creators, students, and professionals to type naturally in Tanglish (Romanized Tamil) and transform it seamlessly into pure, grammatically polished Tamil script.
          </p>
          <div class="about-highlights">
            <div class="highlight-item">
              <strong>⚡ Tanglish to Tamil:</strong> Instant phonetic transliteration with Trie dictionary auto-corrections.
            </div>
            <div class="highlight-item">
              <strong>📸 Tamil OCR:</strong> AI Vision extraction from scanned documents and printed newspapers.
            </div>
            <div class="highlight-item">
              <strong>🎙️ Voice & Audio:</strong> Continuous Tamil speech-to-text recognition with English translation.
            </div>
            <div class="highlight-item">
              <strong>✍️ SEO Blog Creation:</strong> AI Tamil article generation tailored for web publishing.
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import AuthModal from '@/components/AuthModal.vue'

import { useCredits } from '@/composables/useCredits'

const router = useRouter()
const { user, isAuthenticated, logout } = useAuth()
const { theme, toggleTheme, setTheme } = useTheme()
const { creditsLeft, totalCredits, isOutOfCredits, showCreditLimitModal, closeCreditModal } = useCredits()

const showAuthModal = ref(false)
const showUserMenu = ref(false)
const showAboutModal = ref(false)
const mobileMenuOpen = ref(false)

const userInitial = computed(() => {
  if (!user.value?.name) return 'U'
  return user.value.name.charAt(0).toUpperCase()
})

const openLoginModal = () => {
  showAuthModal.value = true
  mobileMenuOpen.value = false
}

const closeAuthModal = () => {
  showAuthModal.value = false
  closeCreditModal()
}

const onLoginSuccess = () => {
  showAuthModal.value = false
  closeCreditModal()
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const handleLogout = () => {
  logout()
  showUserMenu.value = false
  mobileMenuOpen.value = false
  router.push('/')
}

const scrollToTools = () => {
  const el = document.getElementById('ai-tools')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  } else {
    router.push({ path: '/', hash: '#ai-tools' })
  }
}

const openAboutModal = () => {
  showAboutModal.value = true
}

const handleClickOutside = (e) => {
  if (showUserMenu.value && !e.target.closest('.user-menu')) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--nav-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--nav-border);
  transition: all 0.25s ease;
}

.nav-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  user-select: none;
}

.logo-mark {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-svg {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  filter: drop-shadow(0 2px 8px rgba(99, 102, 241, 0.35));
}

.logo-text {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
  background: linear-gradient(135deg, var(--text-main) 60%, var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Center Links */
.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-link {
  position: relative;
  text-decoration: none;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-sub);
  padding: 6px 4px;
  transition: color 0.2s ease;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.nav-link:hover,
.nav-link.active {
  color: var(--text-main);
}

.active-indicator {
  position: absolute;
  bottom: -4px;
  width: 20px;
  height: 2.5px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  border-radius: 4px;
}

/* Right Section */
.nav-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* Credits Badge */
.credits-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--credits-bg);
  border: 1px solid var(--credits-border);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--credits-text);
  user-select: none;
}

.credits-badge.clickable {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.credits-badge.clickable:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

.credits-icon {
  font-size: 13px;
}

/* Theme Switch Pill */
.theme-switch-pill {
  display: inline-flex;
  align-items: center;
  background: var(--toolbar-btn-bg);
  border: 1px solid var(--toolbar-border);
  padding: 3px;
  border-radius: 20px;
  gap: 3px;
  user-select: none;
}

.theme-segment {
  background: transparent;
  border: none;
  width: 32px;
  height: 28px;
  padding: 0;
  border-radius: 14px;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-segment:hover {
  color: var(--text-main);
}

.theme-segment.active {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
}

.theme-icon-svg {
  width: 16px;
  height: 16px;
  display: block;
}

/* Login Button */
.login-btn {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  border: none;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.4);
  background: linear-gradient(135deg, #4338ca, #4f46e5);
}

.google-g-icon {
  background: white;
  border-radius: 50%;
  padding: 2px;
}

.chevron-icon {
  font-size: 17px;
  line-height: 1;
  font-weight: 400;
  margin-left: 2px;
}

/* User Menu */
.user-menu {
  position: relative;
}

.user-avatar-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 2px solid var(--accent-indigo);
  background: var(--toolbar-btn-bg);
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.user-avatar-btn:hover {
  transform: scale(1.05);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  font-weight: 700;
  color: var(--accent-indigo);
  font-size: 15px;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  padding: 8px;
  z-index: 100;
  animation: fadeIn 0.15s ease-out;
}

.user-info {
  padding: 10px 12px;
}

.user-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.dropdown-divider {
  height: 1px;
  background: var(--card-border);
  margin: 6px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--text-sub);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--toolbar-btn-hover);
  color: var(--text-main);
}

.logout-action {
  color: #ef4444;
}

.logout-action:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Mobile Toggle */
.mobile-toggle-btn {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 24px;
  height: 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.mobile-toggle-btn span {
  width: 100%;
  height: 2px;
  background: var(--text-main);
  border-radius: 2px;
}

/* Mobile Drawer */
.mobile-drawer {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-bottom: 1px solid var(--nav-border);
  padding: 16px 24px;
  gap: 12px;
}

.mobile-link {
  color: var(--text-main);
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  padding: 8px 0;
}

.mobile-divider {
  height: 1px;
  background: var(--nav-border);
  margin: 8px 0;
}

.mobile-full-btn {
  width: 100%;
  justify-content: center;
}

/* About Modal */
.about-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.about-modal-card {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  max-width: 520px;
  width: 100%;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  animation: fadeIn 0.2s ease-out;
}

.about-close-btn {
  position: absolute;
  top: 18px;
  right: 20px;
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
}

.about-header {
  text-align: center;
  margin-bottom: 20px;
}

.about-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.about-header h3 {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-main);
}

.about-tagline {
  font-size: 13.5px;
  color: var(--text-sub);
  margin-top: 4px;
}

.about-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-sub);
}

.about-highlights {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card-inner-bg);
  border: 1px solid var(--card-inner-border);
  padding: 16px;
  border-radius: 12px;
}

.highlight-item strong {
  color: var(--text-main);
}

@media (max-width: 900px) {
  .nav-links {
    display: none;
  }
  .credits-badge {
    display: none;
  }
  .mobile-toggle-btn {
    display: flex;
  }
}
</style>