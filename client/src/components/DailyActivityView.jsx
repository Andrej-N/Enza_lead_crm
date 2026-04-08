import { useState, useEffect, useMemo } from 'react'

const ACTION_ICONS = {
  status: '🔄',
  status_change: '🔄',
  call: '📞',
  call_logged: '📞',
  meeting: '📅',
  meeting_scheduled: '📅',
  note: '📝',
  notes_update: '📝',
  verification: '✅',
  contact: '👤',
  contact_update: '👤',
  deal: '💰',
  deal_update: '💰',
  system: '⚙️',
}

const ACTION_COLORS = {
  status: 'border-purple-600/50 bg-purple-900/20 text-purple-300',
  status_change: 'border-purple-600/50 bg-purple-900/20 text-purple-300',
  call: 'border-yellow-600/50 bg-yellow-900/20 text-yellow-300',
  call_logged: 'border-yellow-600/50 bg-yellow-900/20 text-yellow-300',
  meeting: 'border-blue-600/50 bg-blue-900/20 text-blue-300',
  meeting_scheduled: 'border-blue-600/50 bg-blue-900/20 text-blue-300',
  note: 'border-emerald-600/50 bg-emerald-900/20 text-emerald-300',
  notes_update: 'border-emerald-600/50 bg-emerald-900/20 text-emerald-300',
  verification: 'border-teal-600/50 bg-teal-900/20 text-teal-300',
  contact: 'border-sky-600/50 bg-sky-900/20 text-sky-300',
  contact_update: 'border-sky-600/50 bg-sky-900/20 text-sky-300',
  deal: 'border-green-600/50 bg-green-900/20 text-green-300',
  deal_update: 'border-green-600/50 bg-green-900/20 text-green-300',
  system: 'border-gray-600 bg-gray-700/40 text-gray-300',
}

const STATUS_LABELS = {
  not_contacted: 'Nije kontaktiran',
  called: 'Pozvan',
  meeting_scheduled: 'Zakazan sastanak',
  negotiation: 'Pregovori',
  deal_closed: 'Dogovoren posao',
  not_interested: 'Nije zainteresovan',
}

const CATEGORY_ICONS = {
  hotel: '🏨',
  klinika: '🏥',
  investitor: '🏗️',
  prodavac: '🛋️',
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'Z')
  return d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DailyActivityView({ onSelectLead }) {
  const [date, setDate] = useState(todayStr())
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')

  const fetchDaily = async (d) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/activity/daily?date=${d}`, { credentials: 'include' })
      if (!res.ok) {
        setGroups([])
        return
      }
      const data = await res.json()
      setGroups(data)
    } catch (err) {
      console.error('Failed to fetch daily activity:', err)
      setGroups([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchDaily(date) }, [date])

  // Totals for the day
  const totals = useMemo(() => {
    const t = { leads: groups.length, activities: 0, byType: {} }
    for (const g of groups) {
      t.activities += g.activities.length
      for (const a of g.activities) {
        const key = a.action_type || 'system'
        t.byType[key] = (t.byType[key] || 0) + 1
      }
    }
    return t
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (!typeFilter) return groups
    return groups
      .map(g => ({ ...g, activities: g.activities.filter(a => (a.action_type || 'system') === typeFilter) }))
      .filter(g => g.activities.length > 0)
  }, [groups, typeFilter])

  const isToday = date === todayStr()
  const prettyDate = new Date(date + 'T00:00:00').toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const openLead = async (leadId) => {
    if (!onSelectLead) return
    try {
      const res = await fetch(`/api/leads/${leadId}`, { credentials: 'include' })
      const lead = await res.json()
      if (lead && lead.id) onSelectLead(lead)
    } catch (err) {
      console.error('Failed to load lead:', err)
    }
  }

  const typeButtons = [
    ['', 'Sve', '🌐'],
    ['status', 'Status', '🔄'],
    ['call', 'Pozivi', '📞'],
    ['meeting', 'Sastanci', '📅'],
    ['note', 'Beleske', '📝'],
    ['verification', 'Verifikacija', '✅'],
    ['contact', 'Kontakt', '👤'],
    ['deal', 'Dogovori', '💰'],
  ]

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Dnevna aktivnost</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1 capitalize">{prettyDate}{isToday && ' · danas'}</p>
      </div>

      {/* Date picker + navigation */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition"
          title="Prethodni dan"
        >
          ←
        </button>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition"
          title="Sledeci dan"
        >
          →
        </button>
        {!isToday && (
          <button
            onClick={() => setDate(todayStr())}
            className="px-3 py-2 bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-700 text-emerald-300 rounded-lg text-sm transition"
          >
            Danas
          </button>
        )}
      </div>

      {/* KPI cards — 2x2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Aktivni leadovi</div>
          <div className="text-xl md:text-2xl font-bold text-gray-100">{totals.leads}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Akcije</div>
          <div className="text-xl md:text-2xl font-bold text-emerald-400">{totals.activities}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Pozivi</div>
          <div className="text-xl md:text-2xl font-bold text-yellow-400">{totals.byType.call || 0}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Sastanci</div>
          <div className="text-xl md:text-2xl font-bold text-blue-400">{totals.byType.meeting || 0}</div>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {typeButtons.map(([key, label, icon]) => {
          const count = key === '' ? totals.activities : (totals.byType[key] || 0)
          const active = typeFilter === key
          return (
            <button
              key={key || 'all'}
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                active
                  ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <span className="mr-1">{icon}</span>{label}
              <span className="ml-1.5 text-gray-500">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Ucitavanje...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-10 border border-gray-700 text-center">
          <div className="text-4xl mb-2">🌙</div>
          <div className="text-gray-400 text-sm">Nema aktivnosti za ovaj dan</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(({ lead, activities }) => (
            <div
              key={lead.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition"
            >
              {/* Lead header */}
              <button
                onClick={() => openLead(lead.id)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-700 hover:bg-gray-700/40 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{CATEGORY_ICONS[lead.category] || '📌'}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-100 truncate">{lead.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {lead.city || 'Bez grada'}
                      {lead.subcategory && ` · ${lead.subcategory}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-300">
                    {STATUS_LABELS[lead.outreach_status] || lead.outreach_status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-800">
                    {activities.length}
                  </span>
                </div>
              </button>

              {/* Activities list */}
              <div className="divide-y divide-gray-700/60">
                {activities.map(a => {
                  const type = a.action_type || 'system'
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="text-xs text-gray-500 font-mono w-12 flex-shrink-0 pt-0.5">
                        {formatTime(a.created_at)}
                      </div>
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium flex-shrink-0 ${ACTION_COLORS[type] || ACTION_COLORS.system}`}>
                        <span>{ACTION_ICONS[type] || '⚙️'}</span>
                        <span>{a.action}</span>
                      </div>
                      {a.details && (
                        <div className="text-xs text-gray-300 leading-relaxed flex-1 min-w-0 pt-0.5">
                          {a.details}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
