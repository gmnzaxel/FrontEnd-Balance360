import { describe, it, expect } from 'vitest'
import {
  buildCommercialQuoteHtml,
  getCommercialQuoteWhatsAppText,
} from '../utils/ticketGenerator'

describe('Generador de Presupuestos Comerciales (ticketGenerator.js)', () => {
  const sampleConfig = {
    branch_name: 'Ferretería Industrial 360',
    ticket_header: 'Especialistas en herramientas y construcción',
    ticket_address: 'Av. Corrientes 1234, CABA',
    ticket_cuit: '30-71234567-8',
    ticket_phone: '11-5555-4321',
    ticket_email: 'ventas@ferreteria360.com',
  }

  const sampleQuote = {
    id: 1042,
    clientName: 'Constructora del Plata S.A.',
    clientDoc: '30-98765432-1',
    clientPhone: '11-9999-8888',
    validityDays: '15',
    notes: 'Entrega en obra sujeta a disponibilidad de flete.',
    cart: [
      {
        id: 1,
        nombre: 'Taladro Percutor 750W',
        price: 85000,
        quantity: 2,
        discountValue: 0,
        discountType: '$',
      },
      {
        id: 2,
        item_type: 'SERVICIO',
        description: 'Mantenimiento Preventivo y Calibración',
        price: 30000,
        quantity: 1,
        discountValue: 5000,
        discountType: '$',
      },
    ],
    discount: 10,
    discountType: '%',
  }

  describe('buildCommercialQuoteHtml', () => {
    it('retorna string vacío si el presupuesto no tiene ítems', () => {
      expect(buildCommercialQuoteHtml(null)).toBe('')
      expect(buildCommercialQuoteHtml({ cart: [] })).toBe('')
    })

    it('genera el HTML con encabezado corporativo y datos del negocio', () => {
      const html = buildCommercialQuoteHtml(sampleQuote, sampleConfig)
      expect(html).toContain('Ferreter\u00EDa Industrial 360')
      expect(html).toContain('30-71234567-8')
      expect(html).toContain('Presupuesto')
      expect(html).toContain('#PRE-001042')
    })

    it('incluye los datos del cliente y términos de validez', () => {
      const html = buildCommercialQuoteHtml(sampleQuote, sampleConfig)
      expect(html).toContain('Constructora del Plata S.A.')
      expect(html).toContain('30-98765432-1')
      expect(html).toContain('11-9999-8888')
      expect(html).toContain('15 d\u00EDas corridos')
      expect(html).toContain('Entrega en obra sujeta a disponibilidad de flete.')
    })

    it('incluye los artículos y calcula subtotales con diseño limpio de presupuesto', () => {
      const html = buildCommercialQuoteHtml(sampleQuote, sampleConfig)
      expect(html).toContain('Taladro Percutor 750W')
      expect(html).toContain('Mantenimiento Preventivo y Calibraci\u00F3n')
      expect(html).not.toContain('Firma y Aclaraci\u00F3n de Conformidad')
      expect(html).not.toContain('Aceptaci\u00F3n del Cliente')
    })

    it('sanitiza entradas de usuario para prevenir inyección XSS', () => {
      const maliciousQuote = {
        ...sampleQuote,
        clientName: '<script>alert("xss")</script>',
        notes: '<img src=x onerror=alert(1)>',
      }
      const html = buildCommercialQuoteHtml(maliciousQuote, sampleConfig)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<img src=x')
    })
  })

  describe('getCommercialQuoteWhatsAppText', () => {
    it('retorna string vacío si el presupuesto es inválido', () => {
      expect(getCommercialQuoteWhatsAppText(null)).toBe('')
      expect(getCommercialQuoteWhatsAppText({ cart: [] })).toBe('')
    })

    it('genera texto formateado para WhatsApp con emojis y desglose correcto', () => {
      const text = getCommercialQuoteWhatsAppText(sampleQuote, sampleConfig)
      expect(text).toContain('📋 *PRESUPUESTO - FERRETERÍA INDUSTRIAL 360*')
      expect(text).toContain('👤 *Cliente:* Constructora del Plata S.A.')
      expect(text).toContain('• *2x* Taladro Percutor 750W')
      expect(text).toContain('• *1x* Mantenimiento Preventivo y Calibración')
      expect(text).toContain('💰 *TOTAL:')
      expect(text).toContain('📝 *Notas:* Entrega en obra sujeta a disponibilidad de flete.')
    })
  })
})
