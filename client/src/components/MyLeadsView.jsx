import { useState, useEffect } from 'react'

const STATUS_CONFIG = {
  not_contacted:     { label: 'Nije kontaktiran',   bg: 'bg-gray-700 text-gray-300',          dot: 'bg-gray-400' },
  called:            { label: 'Pozvan',              bg: 'bg-yellow-900/50 text-yellow-300',  dot: 'bg-yellow-400' },
  meeting_scheduled: { label: 'Zakazan sastanak',    bg: 'bg-blue-900/50 text-blue-300',      dot: 'bg-blue-400' },
  negotiation:       { label: 'Pregovori',           bg: 'bg-purple-900/50 text-purple-300',  dot: 'bg-purple-400' },
  deal_closed:       { label: 'Dogovoren',           bg: 'bg-green-900/50 text-green-300',    dot: 'bg-green-400' },
  not_interested:    { label: 'Nezainteresovan',     bg: 'bg-red-900/50 text-red-300',        dot: 'bg-red-400' },
}

const CATEGORY_TABS = [
  { key: '',           label: 'Sve',      icon: '📋' },
  { key: 'hotel',      label: 'Hoteli',   icon: '🏨' },
  { key: 'klinika',    label: 'Klinike',  icon: '🏥' },
  { key: 'investitor', label: 'Inv.',     icon: '🏗️' },
  { key: 'prodavac',   label: 'Prod.',    icon: '🛋️' },
]

const STATUS_OPTIONS = [
  ['', 'Svi statusi'],
  ['not_contacted', 'Nije kontaktiran'],
  ['called', 'Pozvan'],
  ['meeting_scheduled', 'Zakazan sastanak'],
  ['negotiation', 'Pregovori'],
  ['deal_closed', 'Dogovoren posao'],
  ['not_interested', 'Nije zainteresovan'],
]

export default function MyLeadsView({ user, onSelectLead, defaultMine = true, onMarkSeen }) {
  const [scope, setScope] = useState(defaultMine ? 'mine' : 'all')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)

  // When entering "Moji" scope, ping the server so the notification badge clears.
  useEffect(() => {
    if (scope === 'mine' && typeof onMarkSeen === 'function') {
      onMarkSeen()
    }
  }, [scope, onMarkSeen])

  const fetchLeads = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (scope === 'mine') params.set('mine', '1')
    if (category) params.set('category', category)
    if (status) params.set('outreach_status', status)
    if (search) params.set('search', search)
    try {
      const res = await fetch(`/api/leads?${params}`, { credentials: 'include' })
      if (!res.ok) { setLeads([]); return }
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch leads:', err)
      setLeads([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchLeads() }, [scope, category, status])
  useEffect(() => {
    const t = setTimeout(fetchLeads, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const isAssignedToMe = (lead) => user && lead.assigned_to === user.id

  const formatDate = (iso) => {
    if (!iso) return null
    try {
      const d = new Date(iso)
      const today = new Date()
      const sameDay = d.toDateString() === today.toDateString()
      if (sameDay) return `danas ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      return d.toLocaleDateString('sr-Latn')
    } catch (e) { return null }
  }

  const categoryIcon = (cat) => {
    const c = CATEGORY_TABS.find(t => t.key === cat)
    return c ? c.icon : '📌'
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">
          {scope === 'mine' ? 'Moji leadovi' : 'Svi leadovi'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {scope === 'mine'
            ? 'Leadovi koji su tebi dodeljeni'
            : 'Pregled svih leadova u bazi'}
        </p>
      </div>

      {/* Scope toggle: Moji / Svi */}
      <div className="mb-4 inline-flex rounded-lg border border-gray-700 bg-gray-800 p-1">
        <button
          onClick={() => setScope('mine')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            scope === 'mine'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Moji
        </button>
        <button
          onClick={() => setScope('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            scope === 'all'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Svi
        </button>
      </div>

      {/* Search */}
      <div className="mb-3 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Pretrazi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-700 rounded-lg text-sm bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Category chips - horizontal scroll on mobile */}
      <div className="mb-3 -mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {CATEGORY_TABS.map(tab => {
            const active = category === tab.key
            return (
              <button
                key={tab.key || 'all'}
                onClick={() => setCategory(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1 ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-300 border border-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-4">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full md:w-auto px-3 py-2 rounded-lg text-sm border border-gray-700 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {STATUS_OPTIONS.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Result count */}
      <div className="mb-3 text-xs text-gray-500">
        {loading ? 'Ucitavanje...' : `${leads.length} ${leads.length === 1 ? 'lead' : 'leadova'}`}
      </div>

      {/* Lead cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Ucitavanje...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {scope === 'mine'
            ? 'Nemas dodeljenih leadova'
            : 'Nema rezultata'}
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => {
            const st = STATUS_CONFIG[lead.outreach_status] || STATUS_CONFIG.not_contacted
            const mine = isAssignedToMe(lead)
            return (
              <button
                key={lead.id}
                onClick={() => onSelectLead && onSelectLead(lead)}
                className={`w-full text-left bg-gray-800 border rounded-xl p-3.5 transition active:scale-[0.99] hover:bg-gray-750 ${
                  mine ? 'border-emerald-700/60' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base flex-shrink-0">{categoryIcon(lead.category)}</span>
                    <div className="font-semibold text-gray-100 truncate">{lead.name}</div>
                  </div>
                  {mine && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/60 text-emerald-300">
                      MOJ
                    </span>
                  )}
                </div>

                {/* Meta line: city + contact */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 flex-wrap">
                  {lead.city && (
                    <span className="inline-flex items-center gap-1">
                      📍 {lead.city}
                    </span>
                  )}
                  {lead.phone1 && (
                    <span className="inline-flex items-center gap-1">
                      📞 {lead.phone1}
                    </span>
                  )}
                  {lead.email && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                      ✉ {lead.email}
                    </span>
                  )}
                </div>

                {/* Status pill + assigned info */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ${st.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                  {!mine && lead.assigned_to_name && (
                    <span className="text-[11px] text-gray-500">
                      Dodeljen: {lead.assigned_to_name}
                    </span>
                  )}
                  {!mine && !lead.assigned_to && (
                    <span className="text-[11px] text-gray-600 italic">
                      Neraspoređen
                    </span>
                  )}
                  {mine && lead.assigned_at && (
                    <span className="text-[11px] text-emerald-400">
                      {formatDate(lead.assigned_at)}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
