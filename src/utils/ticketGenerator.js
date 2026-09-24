import { escapeHtml, safeImageUrl } from './sanitize'
import { loadHtml2Pdf } from './pdfUtils'
import { toast } from 'react-toastify'

/**
 * Genera el documento HTML e imprime un ticket térmico de 58mm o 80mm en una impresora local.
 *
 * @param {object} sale - Objeto de venta con items, total, descuento, etc.
 * @param {object} ticketConfig - Configuración de sucursal, encabezado, pie, logo y ancho.
 */
export const printSaleThermalTicket = (sale, ticketConfig = {}) => {
  if (!sale || !sale.items) return

  const branchName = escapeHtml(ticketConfig?.branch_name || 'TU NEGOCIO')
  const headerText = escapeHtml(ticketConfig?.ticket_header || 'BALANCE 360')
  const footerText = escapeHtml(ticketConfig?.ticket_footer || '¡Gracias por su compra!')
  const address = escapeHtml(ticketConfig?.ticket_address)
  const cuit = escapeHtml(ticketConfig?.ticket_cuit)
  const iibb = escapeHtml(ticketConfig?.ticket_iibb)
  const iva = escapeHtml(ticketConfig?.ticket_iva)
  const phone = escapeHtml(ticketConfig?.ticket_phone)
  const email = escapeHtml(ticketConfig?.ticket_email)
  const rawLogoDataUrl = ticketConfig?.ticket_logo || localStorage.getItem('ticket_logo') || ''
  const safeLogoUrl = safeImageUrl(rawLogoDataUrl)
  const ticketWidth = ticketConfig?.ticket_width || '58mm'
  const is58mm = ticketWidth === '58mm'

  const itemsBaseSubtotal = sale.items.reduce(
    (acc, item) => acc + (parseFloat(item.price) || 0) * (item.quantity || 1),
    0,
  )
  const itemsDiscountTotal = sale.items.reduce(
    (acc, item) => acc + (parseFloat(item.discount) || 0),
    0,
  )
  const globalDiscount = parseFloat(sale.discount) || 0
  const totalDiscount = itemsDiscountTotal + globalDiscount
  const finalTotal = parseFloat(sale.total) || 0

  const htmlContent = `
    <html>
      <head>
        <title>Ticket de Venta #${sale.sale_number || sale.id}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              size: ${ticketWidth} auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: ${is58mm ? '1mm 2.5mm' : '2mm 4mm'};
            }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            width: ${ticketWidth};
            max-width: ${ticketWidth};
            margin: 0 auto;
            padding: ${is58mm ? '1mm 2.5mm' : '2mm 4mm'};
            font-size: ${is58mm ? '11px' : '12px'};
            box-sizing: border-box;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
          }
          .branch-title {
            font-size: ${is58mm ? '14px' : '16px'};
            font-weight: bold;
            text-transform: uppercase;
          }
          .company {
            font-size: ${is58mm ? '10px' : '11px'};
            color: #000;
            margin-bottom: 4px;
            white-space: pre-wrap;
          }
          .info {
            font-size: ${is58mm ? '9px' : '10px'};
            margin-bottom: 3px;
            color: #000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            font-size: ${is58mm ? '10px' : '12px'};
            color: #000;
          }
          td {
            padding: 3px 0;
            color: #000;
          }
          .text-right {
            text-align: right;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 6px;
            margin-top: 4px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: ${is58mm ? '11px' : '12px'};
            color: #000;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: ${is58mm ? '9px' : '10px'};
            white-space: pre-wrap;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
            ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="Logo" style="max-height:${is58mm ? '35px' : '44px'};max-width:${is58mm ? '50px' : '60px'};object-fit:contain;flex-shrink:0;" />` : ''}
            <div class="branch-title">${branchName}</div>
          </div>
          <div class="company">${headerText}</div>
          ${address ? `<div class="info">Dirección: ${address}</div>` : ''}
          ${cuit ? `<div class="info">CUIT: ${cuit}</div>` : ''}
          ${iibb ? `<div class="info">IIBB: ${iibb}</div>` : ''}
          ${iva ? `<div class="info">IVA: ${iva}</div>` : ''}
          ${phone ? `<div class="info">Tel: ${phone}</div>` : ''}
          ${email ? `<div class="info">Email: ${email}</div>` : ''}
          <div class="info">Fecha: ${new Date(sale.date || Date.now()).toLocaleString('es-AR', { hour12: false })}</div>
          <div class="info">Ticket #${sale.sale_number || sale.id}</div>
          <div class="info">Pago: ${sale.payment_method === 'MIXTO' && sale.payment_details
            ? `Dividido (${escapeHtml(sale.payment_details.method_1)}: $${Number(sale.payment_details.amount_1 || 0).toLocaleString('es-AR')} + ${escapeHtml(sale.payment_details.method_2)}: $${Number(sale.payment_details.amount_2 || 0).toLocaleString('es-AR')})`
            : escapeHtml(sale.payment_method || 'EFECTIVO')
          }</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: ${is58mm ? '50%' : '55%'};">Producto</th>
              <th class="text-right" style="width: 20%;">Cant</th>
              <th class="text-right" style="width: 30%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items
              .map((item) => {
                const itemPrice = parseFloat(item.price) || 0
                const qty = item.quantity || 1
                const baseSub = itemPrice * qty
                const descItem = parseFloat(item.discount) || 0
                const rawLabel =
                  item.item_type === 'SERVICIO'
                    ? item.description || 'Servicio'
                    : item.nombre || item.producto_nombre || 'Producto'
                const itemLabel = escapeHtml(rawLabel)

                if (is58mm) {
                  return `
                    <tr>
                      <td colspan="3" style="font-weight: bold; font-size: 11px; padding-top: 4px;">${itemLabel}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #eee;">
                      <td style="font-size: 10px; color: #000; padding-bottom: 4px; padding-left: 5px;">
                        $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        ${qty > 1 ? ` x ${qty}` : ''}
                        ${descItem > 0 ? `<span style="font-weight: bold; text-decoration: underline; margin-left: 4px;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>` : ''}
                      </td>
                      <td class="text-right" style="vertical-align: top; font-size: 10px; color: #000; padding-bottom: 4px;">${qty}</td>
                      <td class="text-right" style="vertical-align: top; font-size: 11px; font-weight: bold; padding-bottom: 4px;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  `
                } else {
                  return `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 4px 0;">
                        <div style="font-weight: bold;">${itemLabel}</div>
                        ${descItem > 0
                          ? `
                            <div style="font-size: 10px; color: #000; margin-top: 2px;">
                              Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              ${qty > 1 ? ` x ${qty} un.` : ''}
                              <span style="font-weight: bold; margin-left: 6px; text-decoration: underline;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                            </div>
                          `
                          : `
                            <div style="font-size: 10px; color: #000; margin-top: 2px;">
                              Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                          `
                        }
                      </td>
                      <td class="text-right" style="vertical-align: top; padding: 4px 0;">${qty}</td>
                      <td class="text-right" style="vertical-align: top; padding: 4px 0;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  `
                }
              })
              .join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="row">
            <span>Subtotal:</span>
            <span>$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          ${totalDiscount > 0
            ? `
              <div class="row">
                <span>Descuento:</span>
                <span>-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>`
            : ''
          }
          <div class="row" style="font-weight: bold; font-size: ${is58mm ? '13px' : '14px'}; margin-top: 5px; border-top: 1px solid #000; padding-top: 3px;">
            <span>TOTAL:</span>
            <span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div class="footer">
          <p>${footerText}</p>
          <p style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 8px; font-size: ${is58mm ? '8px' : '9px'}; color: #000;">*** Copia Cliente ***</p>
        </div>
      </body>
    </html>
  `

  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.width = '0px'
  iframe.style.height = '0px'
  iframe.style.border = 'none'
  iframe.style.top = '-9999px'
  iframe.style.left = '-9999px'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(htmlContent)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 1000)
  }, 300)
}

/**
 * Genera y descarga el archivo PDF del comprobante no fiscal o presupuesto comercial.
 *
 * @param {object} sale - Objeto de venta o presupuesto
 * @param {object} ticketConfig - Configuración de sucursal
 * @returns {Promise<boolean>}
 */
export const downloadSaleReceiptPdf = async (sale, ticketConfig = {}) => {
  if (!sale || !sale.items) return false

  const branchName = escapeHtml(ticketConfig?.branch_name || 'TU NEGOCIO')
  const headerText = escapeHtml(ticketConfig?.ticket_header || 'BALANCE 360')
  const footerText = escapeHtml(ticketConfig?.ticket_footer || '¡Gracias por su compra!')
  const address = escapeHtml(ticketConfig?.ticket_address)
  const cuit = escapeHtml(ticketConfig?.ticket_cuit)
  const iibb = escapeHtml(ticketConfig?.ticket_iibb)
  const iva = escapeHtml(ticketConfig?.ticket_iva)
  const phone = escapeHtml(ticketConfig?.ticket_phone)
  const email = escapeHtml(ticketConfig?.ticket_email)
  const rawLogoDataUrl = ticketConfig?.ticket_logo || localStorage.getItem('ticket_logo') || ''
  const safeLogoUrl = safeImageUrl(rawLogoDataUrl)

  const itemsBaseSubtotal = sale.items.reduce(
    (acc, item) => acc + (parseFloat(item.price) || 0) * (item.quantity || 1),
    0,
  )
  const itemsDiscountTotal = sale.items.reduce(
    (acc, item) => acc + (parseFloat(item.discount) || 0),
    0,
  )
  const globalDiscount = parseFloat(sale.discount) || 0
  const totalDiscount = itemsDiscountTotal + globalDiscount
  const finalTotal = parseFloat(sale.total) || 0

  const htmlContent = `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; font-size: 11px; box-sizing: border-box; background: white; color: #1e293b; line-height: 1.5;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="display: flex; align-items: flex-start; gap: 15px;">
          ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="Logo" style="max-height: 60px; max-width: 90px; object-fit: contain;" />` : ''}
          <div>
            <h1 style="font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a; letter-spacing: -0.5px;">${branchName}</h1>
            <p style="font-size: 11px; color: #64748b; margin: 4px 0 6px 0; white-space: pre-wrap; max-width: 320px;">${headerText}</p>
            <div style="font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 2px;">
              ${address ? `<div>Dirección: ${address}</div>` : ''}
              ${phone ? `<div>Teléfono: ${phone}</div>` : ''}
              ${email ? `<div>Email: ${email}</div>` : ''}
              ${cuit ? `<div>CUIT: ${cuit}</div>` : ''}
              ${iibb ? `<div>IIBB: ${iibb}</div>` : ''}
              ${iva ? `<div>Condición IVA: ${iva}</div>` : ''}
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 18px; font-weight: 800; color: #0284c7; margin: 0 0 5px 0; text-transform: uppercase;">Comprobante de Venta</h2>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">N° ${sale.sale_number || sale.id}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Fecha: ${new Date(sale.date || Date.now()).toLocaleDateString('es-AR')}</div>
          <div style="font-size: 10px; color: #64748b;">Hora: ${new Date(sale.date || Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style="font-size: 11px; font-weight: 600; color: #334155; margin-top: 4px;">Pago: ${sale.payment_method || 'EFECTIVO'}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569;">Cant.</th>
            <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569;">Descripción</th>
            <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #475569;">P. Unit</th>
            <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #475569;">Desc.</th>
            <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #475569;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items
            .map((item, idx) => {
              const itemPrice = parseFloat(item.price) || 0
              const qty = item.quantity || 1
              const baseSub = itemPrice * qty
              const desc = parseFloat(item.discount) || 0
              const finalItemSub = baseSub - desc
              const label = escapeHtml(
                item.item_type === 'SERVICIO'
                  ? item.description || 'Servicio'
                  : item.nombre || item.producto_nombre || 'Producto',
              )
              return `
                <tr style="border-bottom: 1px solid #f1f5f9; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${qty}</td>
                  <td style="padding: 8px 10px; color: #1e293b;">${label}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #475569;">$${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td style="padding: 8px 10px; text-align: right; color: ${desc > 0 ? '#dc2626' : '#94a3b8'};">${desc > 0 ? `-$${desc.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #0f172a;">$${finalItemSub.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                </tr>
              `
            })
            .join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
        <table style="width: 250px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 10px; font-size: 11px; color: #64748b;">Subtotal</td>
            <td style="padding: 4px 10px; text-align: right; font-size: 11px; font-weight: 600; color: #1e293b;">$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          </tr>
          ${totalDiscount > 0
            ? `
              <tr>
                <td style="padding: 4px 10px; font-size: 11px; color: #dc2626;">Descuento Total</td>
                <td style="padding: 4px 10px; text-align: right; font-size: 11px; font-weight: 600; color: #dc2626;">-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            `
            : ''
          }
          <tr style="border-top: 2px solid #0f172a;">
            <td style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Total</td>
            <td style="padding: 8px 10px; text-align: right; font-size: 14px; font-weight: 800; color: #0284c7;">$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 9px; color: #64748b; white-space: pre-wrap; line-height: 1.6;">
        <p style="margin: 0 0 4px 0;">${footerText}</p>
      </div>
    </div>
  `

  try {
    const html2pdf = await loadHtml2Pdf()
    const element = document.createElement('div')
    element.innerHTML = htmlContent
    const opt = {
      margin: 15,
      filename: `Comprobante_Venta_${sale.sale_number || sale.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }
    await html2pdf().from(element).set(opt).save()
    toast.success('PDF descargado con éxito')
    return true
  } catch (error) {
    console.error('Error al generar PDF de comprobante:', error)
    toast.error('Error al generar el PDF')
    return false
  }
}

/**
 * Genera e imprime un presupuesto comercial en formato ticket térmico de 58mm o 80mm.
 *
 * @param {object} quote - Datos del presupuesto
 * @param {object} ticketConfig - Configuración de sucursal
 */
export const printCommercialQuoteTicket = (quote, ticketConfig = {}) => {
  if (!quote || !quote.cart || !quote.cart.length) return

  const branchName = escapeHtml(ticketConfig?.branch_name || 'TU NEGOCIO')
  const headerText = escapeHtml(ticketConfig?.ticket_header || 'BALANCE 360')
  const footerText = escapeHtml(ticketConfig?.ticket_footer || '¡Gracias por su consulta!')
  const address = escapeHtml(ticketConfig?.ticket_address)
  const cuit = escapeHtml(ticketConfig?.ticket_cuit)
  const iibb = escapeHtml(ticketConfig?.ticket_iibb)
  const iva = escapeHtml(ticketConfig?.ticket_iva)
  const phone = escapeHtml(ticketConfig?.ticket_phone)
  const email = escapeHtml(ticketConfig?.ticket_email)
  const dateStr = new Date().toLocaleString('es-AR', { hour12: false })
  const rawLogoDataUrl = ticketConfig?.ticket_logo || localStorage.getItem('ticket_logo') || ''
  const safeLogoUrl = safeImageUrl(rawLogoDataUrl)
  const ticketWidth = ticketConfig?.ticket_width || '58mm'
  const is58mm = ticketWidth === '58mm'
  const validityDays = quote.validityDays || 15
  const clientName = quote.clientName || ''

  const itemsBaseSubtotal = quote.cart.reduce(
    (acc, item) => acc + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1),
    0,
  )
  const itemsDiscountTotal = quote.cart.reduce((acc, item) => {
    const baseSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
    const dv = parseFloat(item.discountValue)
    const descItem =
      !item.discountValue || isNaN(dv) ? 0 : item.discountType === '%' ? baseSub * (dv / 100) : dv
    return acc + descItem
  }, 0)
  const globalDiscount = (() => {
    const currentSub = itemsBaseSubtotal - itemsDiscountTotal
    const dv = parseFloat(quote.discount)
    if (isNaN(dv) || dv <= 0) return 0
    return quote.discountType === '%' ? currentSub * (dv / 100) : dv
  })()
  const totalDiscount = itemsDiscountTotal + globalDiscount
  const finalTotal = itemsBaseSubtotal - totalDiscount

  const htmlContent = `
    <html>
      <head>
        <title>Presupuesto${clientName ? ` - ${clientName}` : ''}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              size: ${ticketWidth} auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: ${is58mm ? '1mm 2.5mm' : '2mm 4mm'};
            }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            width: ${ticketWidth};
            max-width: ${ticketWidth};
            margin: 0 auto;
            padding: ${is58mm ? '1mm 2.5mm' : '2mm 4mm'};
            font-size: ${is58mm ? '11px' : '12px'};
            box-sizing: border-box;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
          }
          .branch-title {
            font-size: ${is58mm ? '14px' : '16px'};
            font-weight: bold;
            text-transform: uppercase;
          }
          .company {
            font-size: ${is58mm ? '10px' : '11px'};
            color: #000;
            margin-bottom: 4px;
            white-space: pre-wrap;
          }
          .info {
            font-size: ${is58mm ? '9px' : '10px'};
            margin-bottom: 3px;
            color: #000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            font-size: ${is58mm ? '10px' : '12px'};
            color: #000;
          }
          td {
            padding: 3px 0;
            color: #000;
          }
          .text-right {
            text-align: right;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 6px;
            margin-top: 4px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: ${is58mm ? '11px' : '12px'};
            color: #000;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: ${is58mm ? '9px' : '10px'};
            white-space: pre-wrap;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
            ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="Logo" style="max-height:${is58mm ? '35px' : '44px'};max-width:${is58mm ? '50px' : '60px'};object-fit:contain;flex-shrink:0;" />` : ''}
            <div class="branch-title">${branchName}</div>
          </div>
          <div class="company">${headerText}</div>
          ${address ? `<div class="info">Dirección: ${address}</div>` : ''}
          ${cuit ? `<div class="info">CUIT: ${cuit}</div>` : ''}
          ${iibb ? `<div class="info">IIBB: ${iibb}</div>` : ''}
          ${iva ? `<div class="info">IVA: ${iva}</div>` : ''}
          ${phone ? `<div class="info">Tel: ${phone}</div>` : ''}
          ${email ? `<div class="info">Email: ${email}</div>` : ''}
          <div class="info">Validez: ${validityDays} días</div>
          ${clientName ? `<div class="info">Cliente: ${escapeHtml(clientName)}</div>` : ''}
          <div class="info">Fecha: ${dateStr}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: ${is58mm ? '50%' : '55%'};">Producto</th>
              <th class="text-right" style="width: 20%;">Cant</th>
              <th class="text-right" style="width: 30%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.cart
              .map((item) => {
                const itemPrice = parseFloat(item.price) || 0
                const qty = parseInt(item.quantity, 10) || 1
                const baseSub = itemPrice * qty
                const dv = parseFloat(item.discountValue)
                const descItem =
                  !item.discountValue || isNaN(dv)
                    ? 0
                    : item.discountType === '%'
                      ? baseSub * (dv / 100)
                      : dv
                const finalSub = baseSub - descItem
                const rawLabel =
                  item.item_type === 'SERVICIO'
                    ? item.description || 'Servicio'
                    : item.nombre || item.producto_nombre || 'Producto'
                const itemLabel = escapeHtml(rawLabel)

                if (is58mm) {
                  return `
                    <tr>
                      <td colspan="3" style="font-weight: bold; font-size: 11px; padding-top: 4px;">${itemLabel}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #eee;">
                      <td style="font-size: 10px; color: #000; padding-bottom: 4px; padding-left: 5px;">
                        $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        ${qty > 1 ? ` x ${qty}` : ''}
                        ${descItem > 0 ? `<span style="font-weight: bold; text-decoration: underline; margin-left: 4px;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>` : ''}
                      </td>
                      <td class="text-right" style="vertical-align: top; font-size: 10px; color: #000; padding-bottom: 4px;">${qty}</td>
                      <td class="text-right" style="vertical-align: top; font-size: 11px; font-weight: bold; padding-bottom: 4px;">$${finalSub.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  `
                } else {
                  return `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 4px 0;">
                        <div style="font-weight: bold;">${itemLabel}</div>
                        ${descItem > 0
                          ? `
                            <div style="font-size: 10px; color: #000; margin-top: 2px;">
                              Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              ${qty > 1 ? ` x ${qty} un.` : ''}
                              <span style="font-weight: bold; margin-left: 6px; text-decoration: underline;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                            </div>
                          `
                          : `
                            <div style="font-size: 10px; color: #000; margin-top: 2px;">
                              Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                          `
                        }
                      </td>
                      <td class="text-right" style="vertical-align: top; padding: 4px 0;">${qty}</td>
                      <td class="text-right" style="vertical-align: top; padding: 4px 0;">$${finalSub.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  `
                }
              })
              .join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="row">
            <span>Subtotal:</span>
            <span>$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          ${totalDiscount > 0
            ? `
              <div class="row">
                <span>Descuento:</span>
                <span>-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>`
            : ''
          }
          <div class="row" style="font-weight: bold; font-size: ${is58mm ? '13px' : '14px'}; margin-top: 5px; border-top: 1px solid #000; padding-top: 3px;">
            <span>TOTAL:</span>
            <span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div class="footer">
          <p>${footerText}</p>
          <p style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 8px; font-size: ${is58mm ? '8px' : '9px'}; color: #000;">*** Presupuesto comercial no válido como factura ***</p>
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.width = '0px'
  iframe.style.height = '0px'
  iframe.style.border = 'none'
  iframe.style.top = '-9999px'
  iframe.style.left = '-9999px'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(htmlContent)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 1000)
  }, 300)
}

/**
 * Genera y descarga el PDF de un presupuesto comercial en hoja A4.
 *
 * @param {object} quote - Datos del presupuesto
 * @param {object} ticketConfig - Configuración de sucursal
 * @returns {Promise<boolean>}
 */
export const downloadCommercialQuotePdf = async (quote, ticketConfig = {}) => {
  if (!quote || !quote.cart || !quote.cart.length) return false

  const branchName = escapeHtml(ticketConfig?.branch_name || 'TU NEGOCIO')
  const headerText = escapeHtml(ticketConfig?.ticket_header || 'BALANCE 360')
  const footerText = escapeHtml(ticketConfig?.ticket_footer || '¡Gracias por su consulta!')
  const address = escapeHtml(ticketConfig?.ticket_address)
  const cuit = escapeHtml(ticketConfig?.ticket_cuit)
  const iibb = escapeHtml(ticketConfig?.ticket_iibb)
  const iva = escapeHtml(ticketConfig?.ticket_iva)
  const phone = escapeHtml(ticketConfig?.ticket_phone)
  const email = escapeHtml(ticketConfig?.ticket_email)
  const dateStr = new Date().toLocaleString('es-AR', { hour12: false })
  const safeClientName = escapeHtml(quote.clientName)
  const rawLogoDataUrl = ticketConfig?.ticket_logo || localStorage.getItem('ticket_logo') || ''
  const safeLogoUrl = safeImageUrl(rawLogoDataUrl)
  const validityDays = quote.validityDays || 15

  const itemsBaseSubtotal = quote.cart.reduce(
    (acc, item) => acc + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1),
    0,
  )
  const itemsDiscountTotal = quote.cart.reduce((acc, item) => {
    const baseSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
    const dv = parseFloat(item.discountValue)
    const descItem =
      !item.discountValue || isNaN(dv) ? 0 : item.discountType === '%' ? baseSub * (dv / 100) : dv
    return acc + descItem
  }, 0)
  const globalDiscount = (() => {
    const currentSub = itemsBaseSubtotal - itemsDiscountTotal
    const dv = parseFloat(quote.discount)
    if (isNaN(dv) || dv <= 0) return 0
    return quote.discountType === '%' ? currentSub * (dv / 100) : dv
  })()
  const totalDiscount = itemsDiscountTotal + globalDiscount
  const finalTotal = itemsBaseSubtotal - totalDiscount

  const htmlContent = `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; font-size: 11px; box-sizing: border-box; background: white; color: #1e293b; line-height: 1.5;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="display: flex; align-items: flex-start; gap: 15px;">
          ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="Logo" style="max-height: 60px; max-width: 90px; object-fit: contain;" />` : ''}
          <div>
            <h1 style="font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a; letter-spacing: -0.5px;">${branchName}</h1>
            <p style="font-size: 11px; color: #64748b; margin: 4px 0 6px 0; white-space: pre-wrap; max-width: 320px;">${headerText}</p>
            <div style="font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 2px;">
              ${address ? `<div>Dirección: ${address}</div>` : ''}
              ${phone ? `<div>Teléfono: ${phone}</div>` : ''}
              ${email ? `<div>Email: ${email}</div>` : ''}
              ${cuit ? `<div>CUIT: ${cuit}</div>` : ''}
              ${iibb ? `<div>IIBB: ${iibb}</div>` : ''}
              ${iva ? `<div>Condición IVA: ${iva}</div>` : ''}
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 18px; font-weight: 800; color: #0284c7; margin: 0 0 5px 0; text-transform: uppercase;">Presupuesto</h2>
          ${safeClientName ? `<div style="font-size: 12px; font-weight: 700; color: #0f172a;">Cliente: ${safeClientName}</div>` : ''}
          <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Fecha: ${dateStr}</div>
          <div style="font-size: 11px; font-weight: 600; color: #0284c7; margin-top: 4px;">Validez: ${validityDays} días</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569;">Cant.</th>
            <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569;">Descripción</th>
            <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #475569;">P. Unit</th>
            <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #475569;">Desc.</th>
            <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #475569;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${quote.cart
            .map((item, idx) => {
              const itemPrice = parseFloat(item.price) || 0
              const qty = parseInt(item.quantity, 10) || 1
              const baseSub = itemPrice * qty
              const dv = parseFloat(item.discountValue)
              const desc =
                !item.discountValue || isNaN(dv)
                  ? 0
                  : item.discountType === '%'
                    ? baseSub * (dv / 100)
                    : dv
              const finalItemSub = baseSub - desc
              const label = escapeHtml(
                item.item_type === 'SERVICIO'
                  ? item.description || 'Servicio'
                  : item.nombre || item.producto_nombre || 'Producto',
              )
              return `
              <tr style="border-bottom: 1px solid #f1f5f9; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${qty}</td>
                <td style="padding: 8px 10px; color: #1e293b;">${label}</td>
                <td style="padding: 8px 10px; text-align: right; color: #475569;">$${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 8px 10px; text-align: right; color: ${desc > 0 ? '#dc2626' : '#94a3b8'};">${desc > 0 ? `-$${desc.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #0f172a;">$${finalItemSub.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            `
            })
            .join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
        <table style="width: 250px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 10px; font-size: 11px; color: #64748b;">Subtotal</td>
            <td style="padding: 4px 10px; text-align: right; font-size: 11px; font-weight: 600; color: #1e293b;">$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          </tr>
          ${totalDiscount > 0
            ? `
            <tr>
              <td style="padding: 4px 10px; font-size: 11px; color: #dc2626;">Descuento Total</td>
              <td style="padding: 4px 10px; text-align: right; font-size: 11px; font-weight: 600; color: #dc2626;">-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          `
            : ''
          }
          <tr style="border-top: 2px solid #0f172a;">
            <td style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Total Presupuestado</td>
            <td style="padding: 8px 10px; text-align: right; font-size: 14px; font-weight: 800; color: #0284c7;">$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 9px; color: #64748b; white-space: pre-wrap; line-height: 1.6;">
        <p style="margin: 0 0 4px 0;">${footerText}</p>
        <p style="margin: 0; color: #94a3b8;">Los precios informados están sujetos a modificaciones según la fecha de aceptación.</p>
      </div>
    </div>
  `;

  try {
    const html2pdf = await loadHtml2Pdf()
    const element = document.createElement('div')
    element.innerHTML = htmlContent
    const opt = {
      margin: 15,
      filename: `Presupuesto_${quote.clientName ? quote.clientName.replace(/\s+/g, '_') : 'Comercial'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }
    await html2pdf().from(element).set(opt).save()
    toast.success('Presupuesto PDF descargado con éxito')
    return true
  } catch (error) {
    console.error('Error al generar PDF de presupuesto:', error)
    toast.error('Error al generar el PDF de presupuesto')
    return false
  }
}
