import { ref, computed } from 'vue'

// Application is locked strictly to light mode as requested by user
const theme = ref('light')

export function useTheme() {
  const isDark = computed(() => false)

  const applyTheme = () => {
    try {
      localStorage.setItem('usil_theme', 'light')
    } catch (_) {}

    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.classList.add('light')
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
  }

  const toggleTheme = () => {
    // Only light mode is permitted
    theme.value = 'light'
    applyTheme()
  }

  const setTheme = () => {
    theme.value = 'light'
    applyTheme()
  }

  // Ensure light theme is applied on initial load
  if (typeof document !== 'undefined') {
    applyTheme()
  }

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme
  }
}
