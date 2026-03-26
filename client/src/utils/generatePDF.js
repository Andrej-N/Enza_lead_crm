import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function generateWeeklyReport() {
  const dashboard = document.getElementById('analytics-dashboard')
  if (!dashboard) {
    alert('Dashboard nije ucitan. Otvorite Dashboard stranicu pa pokusajte ponovo.')
    return
  }

  // Show loading
  const btn = document.querySelector('[data-pdf-btn]')
  const originalText = btn?.textContent
  if (btn) {
    btn.textContent = 'Generisem PDF...'
    btn.disabled = true
  }

  try {
    const canvas = await html2canvas(dashboard, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#f9fafb',
      logging: false,
      windowWidth: dashboard.scrollWidth,
      windowHeight: dashboard.scrollHeight,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10

    // Header
    pdf.setFontSize(18)
    pdf.setTextColor(31, 41, 55)
    pdf.text('Enza Home - Nedeljni Izvestaj', margin, 15)

    pdf.setFontSize(10)
    pdf.setTextColor(107, 114, 128)
    const now = new Date()
    const dateStr = now.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' })
    pdf.text(`Generisano: ${dateStr}`, margin, 22)

    // Line separator
    pdf.setDrawColor(229, 231, 235)
    pdf.line(margin, 25, pageWidth - margin, 25)

    // Dashboard image
    const imgWidth = pageWidth - (margin * 2)
    const imgHeight = (canvas.height / canvas.width) * imgWidth

    let yPosition = 30
    const maxHeightPerPage = pageHeight - 30

    if (imgHeight <= maxHeightPerPage) {
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
    } else {
      // Multi-page: split the canvas
      const totalPages = Math.ceil(imgHeight / maxHeightPerPage)
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage()
          yPosition = 10
        }

        const sourceY = (page * maxHeightPerPage / imgHeight) * canvas.height
        const sourceHeight = Math.min(
          (maxHeightPerPage / imgHeight) * canvas.height,
          canvas.height - sourceY
        )

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sourceHeight
        const ctx = pageCanvas.getContext('2d')
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)

        const pageImgData = pageCanvas.toDataURL('image/png')
        const pageImgHeight = (sourceHeight / canvas.width) * imgWidth
        pdf.addImage(pageImgData, 'PNG', margin, yPosition, imgWidth, pageImgHeight)
      }
    }

    // Footer on last page
    pdf.setFontSize(8)
    pdf.setTextColor(156, 163, 175)
    pdf.text('Enza Home Lead Database - Automatski generisan izvestaj', margin, pageHeight - 5)

    const filename = `enza-nedeljni-izvestaj-${now.toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
  } catch (err) {
    console.error('PDF generation failed:', err)
    alert('Greska pri generisanju PDF-a. Pokusajte ponovo.')
  } finally {
    if (btn) {
      btn.textContent = originalText
      btn.disabled = false
    }
  }
}
