import { describe, it, expect } from 'vitest'
import { formatCurrency, formatARS, formatDate, formatDateOnly } from '../utils/format'

describe('Utilidades de formato (format.js)', () => {
  describe('formatCurrency / formatARS', () => {
    it('formatea números enteros sin decimales superfluos', () => {
      const res = formatCurrency(1500)
      // En locale es-AR, contiene 1.500 y el símbolo $ (con posible espacio fino)
      expect(res).toContain('1.500')
      expect(res).toContain('$')
    })

    it('formatea números con decimales con 2 dígitos', () => {
      const res = formatCurrency(1500.5)
      expect(res).toContain('1.500,50')
    })

    it('maneja valores no numéricos retornando 0', () => {
      const res = formatCurrency(null)
      expect(res).toContain('0')
    })

    it('formatARS es idéntico a formatCurrency', () => {
      expect(formatARS(250)).toBe(formatCurrency(250))
    })
  })

  describe('formatDate y formatDateOnly', () => {
    it('formatDate retorna guión para valores nulos o vacíos', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate('')).toBe('-')
    })

    it('formatDateOnly formatea fechas ISO correctamente a formato DD/MM/YYYY', () => {
      const iso = '2026-05-18T14:30:00Z'
      const formatted = formatDateOnly(iso)
      expect(formatted).toBe('18/05/2026')
    })

    it('formatDateOnly retorna guión si es nulo', () => {
      expect(formatDateOnly(null)).toBe('-')
    })
  })

  describe('getCurrentMonthBounds (QuickMonthReportModal)', () => {
    it('calcula los límites exactos del mes actual', async () => {
      const { getCurrentMonthBounds } = await import('../components/sales/QuickMonthReportModal')
      const bounds = getCurrentMonthBounds()
      const now = new Date()

      expect(bounds.startDate).toMatch(/^\d{4}-\d{2}-01$/)
      expect(bounds.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(bounds.monthLabel).toBeTruthy()
      expect(bounds.daysInMonth).toBeGreaterThanOrEqual(28)
      expect(bounds.currentDay).toBe(now.getDate())
    })
  })
})
