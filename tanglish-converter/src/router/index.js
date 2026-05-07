import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import TanglishEditorPage from '@/views/TanglishEditorPage.vue'
import OCRPage from '@/views/OCRPage.vue'
import AudioToTextPage from '@/views/AudioToTextPage.vue'
import BlogGeneratorPage from '@/views/BlogGeneratorPage.vue'
import SubtitleGeneratorPage from '@/views/SubtitleGeneratorPage.vue'

// Check authentication helper
const isAuthenticated = () => {
    const user = localStorage.getItem('usil_auth_user')
    return !!user
}

const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomePage
    },
    {
        path: '/editor',
        name: 'TanglishEditor',
        component: TanglishEditorPage
        // Editor is free - no auth required
    },
    {
        path: '/ocr',
        name: 'OCR',
        component: OCRPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/audio',
        name: 'AudioToText',
        component: AudioToTextPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/blog',
        name: 'BlogGenerator',
        component: BlogGeneratorPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/subtitle',
        name: 'SubtitleGenerator',
        component: SubtitleGeneratorPage,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guard for protected routes
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !isAuthenticated()) {
        // Redirect to home page with login required message
        next('/')
        // You can also show a toast/notification here
    } else {
        next()
    }
})

export default router