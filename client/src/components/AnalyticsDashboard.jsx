import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const STATUS_LABELS = {
  not_contacted: 'Nije kontaktiran',
  called: 'Pozvan',
  meeting_scheduled: 'Zakazan sastanak',
  negotiation: 'Pregovori',
  deal_closed: 'Dogovoren posao',
  not_interested: 'Nije zainteresovan',
}

const STATUS_COLORS = {
  not_contacted: '#6b7280',
  called: '#eab308',
  meeting_scheduled: '#3b82f6',
  negotiation: '#a855f7',
  deal_closed: '#22c55e',
  not_interested: '#ef4444',
}

const CATEGORY_LABELS = {
  hotel: 'Hoteli',
  klinika: 'Klinike',
  investitor: 'Investitori',
  prodavac: 'Prodavci',
}

const CATEGORY_COLORS = {
  hotel: '#3b82f6',
  klinika: '#f43f5e',
  investitor: '#f97316',
  prodavac: '#8b5cf6',
}

const FUNNEL_ORDER = ['not_contacted', 'called', 'meeting_scheduled', 'negotiation', 'deal_closed']

const darkTooltipStyle = {
  contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb' },
  itemStyle: { color: '#e5e7eb' },
  labelStyle: { color: '#9ca3af' },
}

function WeeklySummaryCard({ data }) {
  if (!data) return null
  const { thisWeek, lastWeek } = data

  const delta = (curr, prev) => {
    const d = curr - prev
    if (d > 0) return <span className="text-emerald-400 font-medium">+{d}</span>
    if (d < 0) return <span className="text-red-400 font-medium">{d}</span>
    return <span className="text-gray-500">0</span>
  }

  const items = [
    { label: 'Novi leadovi', value: thisWeek.newLeads, prev: lastWeek.newLeads },
    { label: 'Pozivi', value: thisWeek.calls, prev: lastWeek.calls },
    { label: 'Sastanci', value: thisWeek.meetings, prev: lastWeek.meetings },
    { label: 'Zatvoreni dealovi', value: thisWeek.deals, prev: lastWeek.deals },
    { label: 'Ukupna aktivnost', value: thisWeek.totalActivity, prev: lastWeek.totalActivity },
  ]

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Nedeljni pregled</h3>
      <div className="grid grid-cols-5 gap-3">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl font-bold text-gray-100">{item.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
            <div className="text-xs mt-1">vs prosla: {delta(item.value, item.prev)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineFunnel({ data }) {
  if (!data || !data.length) return null

  const totals = {}
  FUNNEL_ORDER.forEach(s => { totals[s] = 0 })
  data.forEach(row => {
    if (totals[row.status] !== undefined) totals[row.status] += row.cnt
  })

  const funnelData = FUNNEL_ORDER.map(status => ({
    name: STATUS_LABELS[status],
    value: totals[status],
    fill: STATUS_COLORS[status],
  }))

  const maxVal = Math.max(...funnelData.map(d => d.value), 1)

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Pipeline Levak</h3>
      <div className="space-y-2">
        {funnelData.map((item, i) => {
          const width = Math.max((item.value / maxVal) * 100, 4)
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-300 text-right">{item.name}</div>
              <div className="flex-1 relative">
                <div
                  className="h-8 rounded-lg flex items-center justify-center transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: item.fill, margin: '0 auto', marginLeft: `${(100 - width) / 2}%` }}
                >
                  <span className="text-xs font-bold text-white">{item.value}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConversionByCategory({ data }) {
  if (!data || !data.length) return null

  const categories = [...new Set(data.map(d => d.category))]
  const chartData = categories.map(cat => {
    const row = { name: CATEGORY_LABELS[cat] || cat }
    const catRows = data.filter(d => d.category === cat)
    const total = catRows.reduce((s, r) => s + r.cnt, 0)
    const contacted = catRows.filter(r => ['called', 'meeting_scheduled', 'negotiation', 'deal_closed'].includes(r.status)).reduce((s, r) => s + r.cnt, 0)
    row.total = total
    row.contacted = contacted
    row.rate = total > 0 ? Math.round((contacted / total) * 100) : 0
    return row
  })

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Konverzija po kategoriji</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={80} />
          <Tooltip {...darkTooltipStyle} formatter={(v, name) => [v, name === 'total' ? 'Ukupno' : 'Kontaktirano']} />
          <Bar dataKey="total" fill="#4b5563" radius={[0, 4, 4, 0]} name="Ukupno" />
          <Bar dataKey="contacted" fill="#10b981" radius={[0, 4, 4, 0]} name="Kontaktirano" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2">
        {chartData.map((d, i) => (
          <div key={i} className="text-center">
            <div className="text-lg font-bold text-emerald-400">{d.rate}%</div>
            <div className="text-[10px] text-gray-500">{d.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopCitiesChart({ data }) {
  if (!data || !data.length) return null

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Top 10 gradova</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis dataKey="city" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={120} />
          <Tooltip {...darkTooltipStyle} formatter={(v) => [v, 'Leadova']} />
          <Bar dataKey="cnt" fill="#14b8a6" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ResponseRateDonut({ stats }) {
  if (!stats || !stats.byStatus) return null

  const contacted = (stats.byStatus.called || 0) + (stats.byStatus.meeting_scheduled || 0) +
    (stats.byStatus.negotiation || 0) + (stats.byStatus.deal_closed || 0)
  const notContacted = stats.byStatus.not_contacted || 0
  const notInterested = stats.byStatus.not_interested || 0

  const data = [
    { name: 'Kontaktirano', value: contacted, fill: '#10b981' },
    { name: 'Nije kontaktirano', value: notContacted, fill: '#6b7280' },
    { name: 'Nije zainteresovano', value: notInterested, fill: '#ef4444' },
  ].filter(d => d.value > 0)

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Response Rate</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip {...darkTooltipStyle} formatter={(v) => [v, 'Leadova']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-[10px] text-gray-400">{d.name}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsDashboard({ stats, onExportPDF }) {
  const [pipeline, setPipeline] = useState([])
  const [cities, setCities] = useState([])
  const [conversion, setConversion] = useState([])
  const [weeklySummary, setWeeklySummary] = useState(null)

  useEffect(() => {
    const opts = { credentials: 'include' }
    fetch('/api/stats/pipeline', opts).then(r => r.json()).then(setPipeline).catch(console.error)
    fetch('/api/stats/cities', opts).then(r => r.json()).then(setCities).catch(console.error)
    fetch('/api/stats/conversion', opts).then(r => r.json()).then(setConversion).catch(console.error)
    fetch('/api/stats/weekly-summary', opts).then(r => r.json()).then(setWeeklySummary).catch(console.error)
  }, [])

  return (
    <div id="analytics-dashboard" className="space-y-6">
      {/* Weekly summary */}
      <div className="flex items-center justify-between">
        <div />
        {onExportPDF && (
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Eksportuj PDF Izvestaj
          </button>
        )}
      </div>

      <WeeklySummaryCard data={weeklySummary} />

      <div className="grid grid-cols-2 gap-6">
        <PipelineFunnel data={pipeline} />
        <ResponseRateDonut stats={stats} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ConversionByCategory data={conversion} />
        <TopCitiesChart data={cities} />
      </div>
    </div>
  )
}
