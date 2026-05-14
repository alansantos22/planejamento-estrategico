/**
 * Theme store — controla o tema visual (light / dark).
 *
 * Aplica `data-theme="dark|light"` em `<html>`, persiste em
 * localStorage e respeita `prefers-color-scheme` na primeira visita.
 *
 * O `_base.scss` declara as CSS vars do tema; trocar o atributo
 * já basta para repintar toda a UI.
 */

import { defineStore } from 'pinia'

const STORAGE_KEY = 'pe.theme'

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function detectSystem() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyToDom(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: readStored() ?? detectSystem()
  }),

  getters: {
    isDark: (s) => s.theme === 'dark'
  },

  actions: {
    init() {
      applyToDom(this.theme)
    },
    setTheme(theme) {
      if (theme !== 'light' && theme !== 'dark') return
      this.theme = theme
      applyToDom(theme)
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        // armazenamento indisponível — segue só em memória.
      }
    },
    toggle() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark')
    }
  }
})
