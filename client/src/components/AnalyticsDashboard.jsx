import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
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

const FUNNEL_ORDER = ['not_contacted', 'called', 'meeting_scheduled', 'negotiation', 'deal_closed']

const darkTooltipStyle = {
  contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb' },
  itemStyle: { color: '#e5e7eb' },
  labelStyle: { color: '#9ca3af' },
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
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Pipeline</h3>
      <div className="space-y-2">
        {funnelData.map((item, i) => {
          const width = Math.max((item.value / maxVal) * 100, 4)
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-400 text-right">{item.name}</div>
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

function ResponseRateDonut({ stats }) {
  if (!stats || !stats.byStatus) return null

  const contacted = (stats.byStatus.called || 0) + (stats.byStatus.meeting_scheduled || 0) +
    (stats.byStatus.negotiation || 0) + (stats.byStatus.deal_closed || 0)
  const notContacted = stats.byStatus.not_contacted || 0
  const notInterested = stats.byStatus.not_interested || 0

  const data = [
    { name: 'Kontaktirano', value: contacted, fill: '#10b981' },
    { name: 'Nije kontaktirano', value: notContacted, fill: '#4b5563' },
    { name: 'Nije zainteresovano', value: notInterested, fill: '#ef4444' },
  ].filter(d => d.value > 0)

  if (!data.length) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Response Rate</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip {...darkTooltipStyle} formatter={(v) => [v, 'Leadova']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-5 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-xs text-gray-400">{d.name}: <span className="text-gray-300 font-medium">{d.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsDashboard({ stats }) {
  const [pipeline, setPipeline] = useState([])

  useEffect(() => {
    fetch('/api/stats/pipeline', { credentials: 'include' })
      .then(r => r.json())
      .then(setPipeline)
      .catch(console.error)
  }, [])

  return (
    <div id="analytics-dashboard" className="grid grid-cols-2 gap-6">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <PipelineFunnel data={pipeline} />
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <ResponseRateDonut stats={stats} />
      </div>
    </div>
  )
}
