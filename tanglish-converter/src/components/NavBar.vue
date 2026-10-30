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

      <!-- Center Navigation Links (Only shown when logged in) -->
      <div v-if="isAuthenticated" class="nav-links">
        <router-link to="/editor" class="nav-link" active-class="active">Editor</router-link>
        <router-link to="/ocr" class="nav-link" active-class="active">OCR</router-link>
        <router-link to="/audio" class="nav-link" active-class="active">Audio</router-link>
        <router-link to="/subtitle" class="nav-link" active-class="active">Subtitles</router-link>
        <router-link to="/admin" class="nav-link" active-class="active">Admin</router-link>
      </div>

      <!-- Right Section -->
      <div class="nav-right">
        <!-- Credits Badge (30 credits, carries over with/without login, refills every 16h) -->
        <div 
          class="credits-badge" 
          @click="!isAuthenticated && openLoginModal()"
          :class="{ 'clickable': !isAuthenticated }"
          :title="creditsLeft + ' of 30 grammar checks remaining. Refills in ' + formattedTimeUntilRefill"
        >
          <span class="credits-icon">⚡</span>
          <span class="credits-text">{{ creditsLeft }} credits</span>
        </div>

        <!-- User Menu (Logged In) -->
        <div v-if="isAuthenticated" class="user-cluster user-menu">
          <!-- User Profile (Avatar + Name) -->
          <div class="user-profile-badge" @click.stop="toggleUserMenu" :title="user?.name || user?.email || 'User Account'">
            <button class="user-avatar-btn" type="button" aria-label="User Account" @click.stop="toggleUserMenu">
              <img v-if="user?.picture" :src="user.picture" alt="Profile" class="avatar-img" />
              <span v-else class="avatar-initial">{{ userInitial }}</span>
            </button>
            <span class="user-short-name">{{ userShortName }}</span>
          </div>

          <!-- Direct Mobile Logout Button (Visible on mobile) -->
          <button 
            type="button" 
            class="header-direct-logout-btn" 
            @click="handleLogout" 
            title="Log out of Usil AI"
          >
            <span>Logout</span>
          </button>

          <!-- Desktop Dropdown -->
          <div v-if="showUserMenu" class="user-dropdown" @click.stop>
            <div class="user-info">
              <div class="user-name">{{ user?.name || 'Usil User' }}</div>
              <div class="user-email">{{ user?.email }}</div>
            </div>
            <div class="dropdown-divider"></div>
            <router-link to="/editor" class="dropdown-item" @click="showUserMenu = false">
              <span class="dropdown-icon">📄</span>
              <span>Tamil Documents</span>
            </router-link>
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

        <!-- Google Log in Button (Logged Out - like before) -->
        <div v-else class="auth-buttons">
          <button type="button" class="login-btn" @click="openLoginModal">
            <svg class="google-g-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Log in</span>
            <span class="chevron-icon">›</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Google Auth Modal -->
    <AuthModal 
      :isOpen="showAuthModal || showCreditLimitModal" 
      :title="!isAuthenticated && isOutOfCredits ? 'Limit Reached' : 'Sign in to Usil AI'"
      :subtitle="!isAuthenticated && isOutOfCredits ? 'Sign in' : 'Continue with your Google account to access all AI features.'"
      :minimal="!isAuthenticated && isOutOfCredits"
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
import AuthModal from '@/components/AuthModal.vue'

import { useCredits } from '@/composables/useCredits'

const router = useRouter()
const { user, isAuthenticated, logout } = useAuth()
const { creditsLeft, totalCredits, isOutOfCredits, formattedTimeUntilRefill, showCreditLimitModal, closeCreditModal } = useCredits()

const showAuthModal = ref(false)
const showUserMenu = ref(false)
const showAboutModal = ref(false)
const mobileMenuOpen = ref(false)

const userInitial = computed(() => {
  if (!user.value?.name) return 'U'
  return user.value.name.charAt(0).toUpperCase()
})

const userShortName = computed(() => {
  if (!user.value) return ''
  const name = user.value.name || user.value.email || 'User'
  return name.split(' ')[0]
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

const handleLogout = async () => {
  await logout()
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
  if (showUserMenu.value && !e.target.closest('.user-menu') && !e.target.closest('.user-cluster')) {
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
  background: #ffffff;
  border-bottom: 1px solid var(--nav-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
  white-space: nowrap;
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
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05);
  padding: 8px;
  z-index: 1000;
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

/* User Cluster */
.user-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.user-profile-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-short-name {
  display: none;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-direct-logout-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 5px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.2;
}

.header-direct-logout-btn:hover {
  background: #fecaca;
  color: #b91c1c;
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
    display: none !important;
  }
  .credits-badge {
    display: none !important;
  }
  .mobile-toggle-btn {
    display: none !important;
  }
  .user-short-name {
    display: inline-block;
  }
  .header-direct-logout-btn {
    display: inline-flex;
  }
}

@media (max-width: 480px) {
  .nav-container {
    padding: 8px 12px;
    height: 52px;
  }
  .logo-text {
    font-size: 16px;
  }
  .user-short-name {
    max-width: 65px;
    font-size: 11.5px;
  }
  .header-direct-logout-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
  .login-btn {
    padding: 5px 10px;
    font-size: 12px;
  }
}

@media (max-width: 360px) {
  .user-short-name {
    display: none;
  }
}
</style>