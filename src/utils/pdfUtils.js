/**
 * Singleton loader for html2pdf.js
 * Prevents multiple script injections into the DOM and handles load failures gracefully.
 */

let pdfPromise = null

export const loadHtml2Pdf = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'))
  }

  if (window.html2pdf) {
    return Promise.resolve(window.html2pdf)
  }

  if (pdfPromise) {
    return pdfPromise
  }

  pdfPromise = new Promise((resolve, reject) => {
    // Check if script element already exists in document
    const existingScript = document.querySelector('script[data-lib="html2pdf"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.html2pdf))
      existingScript.addEventListener('error', (err) => reject(err))
      return
    }

    const script = document.createElement('script')
    script.setAttribute('data-lib', 'html2pdf')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.async = true

    script.onload = () => {
      if (window.html2pdf) {
        resolve(window.html2pdf)
      } else {
        reject(new Error('html2pdf loaded but window.html2pdf is not available'))
      }
    }

    script.onerror = (err) => {
      pdfPromise = null // Allow retry on failure
      reject(err)
    }

    document.body.appendChild(script)
  })

  return pdfPromise
}

export default loadHtml2Pdf
