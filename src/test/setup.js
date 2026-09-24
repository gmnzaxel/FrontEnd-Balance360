import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// Mock de matchMedia para pruebas en entorno jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Limpiar localStorage antes de cada prueba
beforeEach(() => {
  localStorage.clear()
})
