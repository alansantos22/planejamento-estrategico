/**
 * UI store — controla o modal global usado pelo AI Helper.
 * Mantemos modais como `unstacked single` (um por vez) — se outro for aberto, substitui.
 */

import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    modal: null
  }),

  actions: {
    openModal(payload) {
      this.modal = payload
    },
    closeModal() {
      this.modal = null
    }
  }
})
