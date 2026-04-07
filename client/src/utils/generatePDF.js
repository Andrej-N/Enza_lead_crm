import { jsPDF } from 'jspdf'

const STATUS_LABELS = {
  not_contacted: 'Nije kontaktiran',
  called: 'Pozvan',
  meeting_scheduled: 'Zakazan sastanak',
  negotiation: 'Pregovori',
  deal_closed: 'Dogovoren posao',
  not_interested: 'Nije zainteresovan',
}

const STATUS_COLORS = {
  not_contacted: [107, 114, 128],
  called: [234, 179, 8],
  meeting_scheduled: [59, 130, 246],
  negotiation: [168, 85, 247],
  deal_closed: [34, 197, 94],
  not_interested: [239, 68, 68],
}

const FUNNEL_ORDER = ['not_contacted', 'called', 'meeting_scheduled', 'negotiation', 'deal_closed']

export async function generateWeeklyReport() {
  const btn = document.querySelector('[data-pdf-btn]')
  const originalText = btn?.textContent
  if (btn) {
    btn.textContent = 'Generisem PDF...'
    btn.disabled = true
  }

  try {
    // Fetch all data
    const opts = { credentials: 'include' }
    const [statsRes, pipelineRes] = await Promise.all([
      fetch('/api/stats', opts),
      fetch('/api/stats/pipeline', opts),
    ])
    const stats = await statsRes.json()
    const pipeline = await pipelineRes.json()

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 15
    const contentWidth = pageWidth - margin * 2
    const now = new Date()
    const dateStr = now.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' })

    // --- Header ---
    pdf.setFontSize(20)
    pdf.setTextColor(31, 41, 55)
    pdf.text('Enza Home - Nedeljni Izvestaj', margin, 20)

    pdf.setFontSize(10)
    pdf.setTextColor(120, 120, 120)
    pdf.text(dateStr, margin, 27)

    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, 31, pageWidth - margin, 31)

    // --- KPI boxes ---
    let y = 38
    const contacted = (stats.byStatus.called || 0) + (stats.byStatus.meeting_scheduled || 0) +
      (stats.byStatus.negotiation || 0) + (stats.byStatus.deal_closed || 0)
    const contactRate = stats.total > 0 ? Math.round((contacted / stats.total) * 100) : 0

    const kpis = [
      { label: 'Ukupno leadova', value: String(stats.total) },
      { label: 'Kontaktirano', value: `${contacted} (${contactRate}%)` },
      { label: 'Zakazani sastanci', value: String(stats.byStatus.meeting_scheduled || 0) },
      { label: 'Dogovoreni poslovi', value: String(stats.byStatus.deal_closed || 0) },
    ]

    const boxWidth = (contentWidth - 9) / 4 // 3 gaps of 3mm
    kpis.forEach((kpi, i) => {
      const x = margin + i * (boxWidth + 3)
      pdf.setFillColor(245, 245, 245)
      pdf.roundedRect(x, y, boxWidth, 22, 2, 2, 'F')

      pdf.setFontSize(8)
      pdf.setTextColor(120, 120, 120)
      pdf.text(kpi.label, x + 4, y + 7)

      pdf.setFontSize(16)
      pdf.setTextColor(31, 41, 55)
      pdf.text(kpi.value, x + 4, y + 17)
    })

    // --- Pipeline Funnel ---
    y += 32
    pdf.setFontSize(13)
    pdf.setTextColor(31, 41, 55)
    pdf.text('Pipeline', margin, y)
    y += 6

    const totals = {}
    FUNNEL_ORDER.forEach(s => { totals[s] = 0 })
    pipeline.forEach(row => {
      if (totals[row.status] !== undefined) totals[row.status] += row.cnt
    })
    const maxVal = Math.max(...FUNNEL_ORDER.map(s => totals[s]), 1)
    const barMaxWidth = contentWidth - 45

    FUNNEL_ORDER.forEach(status => {
      const val = totals[status]
      const barWidth = Math.max((val / maxVal) * barMaxWidth, 3)
      const color = STATUS_COLORS[status]

      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(STATUS_LABELS[status], margin, y + 5, { align: 'left' })

      const barX = margin + 42
      pdf.setFillColor(color[0], color[1], color[2])
      pdf.roundedRect(barX, y, barWidth, 7, 1, 1, 'F')

      pdf.setFontSize(8)
      pdf.setTextColor(60, 60, 60)
      pdf.text(String(val), barX + barWidth + 3, y + 5)

      y += 11
    })

    // --- Response Rate ---
    y += 5
    pdf.setFontSize(13)
    pdf.setTextColor(31, 41, 55)
    pdf.text('Response Rate', margin, y)
    y += 8

    const notContacted = stats.byStatus.not_contacted || 0
    const notInterested = stats.byStatus.not_interested || 0
    const total = contacted + notContacted + notInterested

    const responseData = [
      { label: 'Kontaktirano', value: contacted, color: [16, 185, 129] },
      { label: 'Nije kontaktirano', value: notContacted, color: [107, 114, 128] },
      { label: 'Nije zainteresovano', value: notInterested, color: [239, 68, 68] },
    ].filter(d => d.value > 0)

    // Draw as horizontal stacked bar
    let barX = margin
    const totalBarWidth = contentWidth
    responseData.forEach(item => {
      const w = total > 0 ? (item.value / total) * totalBarWidth : 0
      if (w > 0) {
        pdf.setFillColor(item.color[0], item.color[1], item.color[2])
        pdf.roundedRect(barX, y, w, 10, 1, 1, 'F')
        if (w > 15) {
          pdf.setFontSize(7)
          pdf.setTextColor(255, 255, 255)
          const pct = Math.round((item.value / total) * 100)
          pdf.text(`${pct}%`, barX + w / 2, y + 6.5, { align: 'center' })
        }
        barX += w
      }
    })
    y += 15

    // Legend
    responseData.forEach(item => {
      pdf.setFillColor(item.color[0], item.color[1], item.color[2])
      pdf.circle(margin + 2, y, 1.5, 'F')
      pdf.setFontSize(8)
      pdf.setTextColor(80, 80, 80)
      pdf.text(`${item.label}: ${item.value}`, margin + 6, y + 1)
      y += 6
    })

    // --- Kategorije ---
    y += 5
    pdf.setFontSize(13)
    pdf.setTextColor(31, 41, 55)
    pdf.text('Po kategorijama', margin, y)
    y += 6

    const categories = [
      { key: 'hotel', label: 'Hoteli' },
      { key: 'klinika', label: 'Privatne Klinike' },
      { key: 'investitor', label: 'Investitori' },
      { key: 'prodavac', label: 'Prodavci Namestaja' },
    ]

    categories.forEach(cat => {
      const count = stats.byCategory[cat.key] || 0
      pdf.setFontSize(9)
      pdf.setTextColor(80, 80, 80)
      pdf.text(cat.label, margin, y + 5)
      pdf.setTextColor(31, 41, 55)
      pdf.text(String(count), margin + 50, y + 5)
      y += 8
    })

    // --- Footer ---
    const pageHeight = pdf.internal.pageSize.getHeight()
    pdf.setFontSize(7)
    pdf.setTextColor(160, 160, 160)
    pdf.text('Enza Home Lead Database - Automatski generisan izvestaj', margin, pageHeight - 8)

    const filename = `enza-nedeljni-izvestaj-${now.toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
  } catch (err) {
    console.error('PDF generation failed:', err)
    alert('Greska pri generisanju PDF-a: ' + err.message)
  } finally {
    if (btn) {
      btn.textContent = originalText
      btn.disabled = false
    }
  }
}
