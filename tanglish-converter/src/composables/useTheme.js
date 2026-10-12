import { ref, computed, onMounted } from 'vue'

const theme = ref(localStorage.getItem('usil_theme') || 'dark')

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  const applyTheme = (currentTheme) => {
    localStorage.setItem('usil_theme', currentTheme)
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      if (currentTheme === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.add('light')
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    }
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(theme.value)
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
    applyTheme(newTheme)
  }

  // Ensure theme is applied on initial load
  if (typeof document !== 'undefined') {
    applyTheme(theme.value)
  }

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme
  }
}
