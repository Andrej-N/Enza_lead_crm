import { useState, useEffect } from 'react'

const STATUS_LABELS = {
  not_contacted: 'Nije kontaktiran',
  called: 'Pozvan',
  meeting_scheduled: 'Zakazan sastanak',
  negotiation: 'Pregovori',
  deal_closed: 'Dogovoren posao',
  not_interested: 'Nije zainteresovan',
}

const ACTION_ICONS = {
  status: '🔄',
  call: '📞',
  meeting: '📅',
  note: '📝',
  verification: '✅',
  contact: '👤',
  deal: '💰',
  system: '⚙️',
}

const ACTION_COLORS = {
  status: 'border-purple-600/50 bg-purple-900/20 text-purple-300',
  call: 'border-yellow-600/50 bg-yellow-900/20 text-yellow-300',
  meeting: 'border-blue-600/50 bg-blue-900/20 text-blue-300',
  note: 'border-emerald-600/50 bg-emerald-900/20 text-emerald-300',
  verification: 'border-teal-600/50 bg-teal-900/20 text-teal-300',
  contact: 'border-sky-600/50 bg-sky-900/20 text-sky-300',
  deal: 'border-green-600/50 bg-green-900/20 text-green-300',
  system: 'border-gray-600 bg-gray-700/40 text-gray-300',
}

const ACTION_TYPE_LABELS = {
  status: 'Status',
  call: 'Poziv',
  meeting: 'Sastanak',
  note: 'Beleska',
  verification: 'Verifikacija',
  contact: 'Kontakt',
  deal: 'Dogovor',
  system: 'Sistem',
}

const CATEGORY_ICONS = {
  hotel: '🏨',
  klinika: '🏥',
  investitor: '🏗️',
  prodavac: '🛋️',
}

// Make raw `details` strings friendlier for admins (translate status codes etc.)
function prettifyDetails(details) {
  if (!details) return ''
  // "Status promenjen u: meeting_scheduled" -> "Status promenjen u: Zakazan sastanak"
  const statusMatch = details.match(/^Status promenjen u: (\w+)$/)
  if (statusMatch) {
    const code = statusMatch[1]
    return `Status promenjen u: ${STATUS_LABELS[code] || code}`
  }
  return details
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminPerformanceTab() {
  const [fromDate, setFromDate] = useState(shiftDays(-6))
  const [toDate, setToDate] = useState(todayStr())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [drillUser, setDrillUser] = useState(null)
  const [drillDate, setDrillDate] = useState(todayStr())
  const [drillData, setDrillData] = useState([])
  const [drillLoading, setDrillLoading] = useState(false)

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate })
      const res = await fetch(`/api/admin/employee-performance?${params}`, { credentials: 'include' })
      if (!res.ok) { setRows([]); return }
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch performance:', err)
      setRows([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchPerformance() }, [fromDate, toDate])

  const fetchDrill = async (userId, date) => {
    setDrillLoading(true)
    try {
      const params = new URLSearchParams({ user_id: userId, date })
      const res = await fetch(`/api/admin/employee-activity?${params}`, { credentials: 'include' })
      if (!res.ok) { setDrillData([]); return }
      const data = await res.json()
      setDrillData(Array.isArray(data) ? data : (data.groups || []))
    } catch (err) {
      console.error('Failed to fetch drill activity:', err)
      setDrillData([])
    }
    setDrillLoading(false)
  }

  const openDrill = (user) => {
    setDrillUser(user)
    setDrillDate(todayStr())
    fetchDrill(user.user_id, todayStr())
  }

  const changeDrillDate = (newDate) => {
    setDrillDate(newDate)
    if (drillUser) fetchDrill(drillUser.user_id, newDate)
  }

  const setRangePreset = (days) => {
    setFromDate(shiftDays(-(days - 1)))
    setToDate(todayStr())
  }

  const totals = rows.reduce((acc, r) => ({
    calls: acc.calls + (r.calls || 0),
    meetings: acc.meetings + (r.meetings || 0),
    notes: acc.notes + (r.notes || 0),
    deals: acc.deals + (r.deals || 0),
    total_actions: acc.total_actions + (r.total_actions || 0),
    leads_touched: acc.leads_touched + (r.leads_touched || 0),
  }), { calls: 0, meetings: 0, notes: 0, deals: 0, total_actions: 0, leads_touched: 0 })

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Performanse zaposlenih</h2>
          <p className="text-xs text-gray-500 mt-0.5">Pregled aktivnosti po korisniku u izabranom periodu</p>
        </div>
      </div>

      {/* Date range picker */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-400">Od</label>
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <label className="text-xs text-gray-400">Do</label>
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="flex gap-1.5 ml-2">
          <button onClick={() => setRangePreset(1)} className="text-xs px-2.5 py-1 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition">Danas</button>
          <button onClick={() => setRangePreset(7)} className="text-xs px-2.5 py-1 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition">7 dana</button>
          <button onClick={() => setRangePreset(30)} className="text-xs px-2.5 py-1 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition">30 dana</button>
        </div>
      </div>

      {/* Totals summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500">Pozivi</div>
          <div className="text-xl font-bold text-yellow-300">{totals.calls}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500">Sastanci</div>
          <div className="text-xl font-bold text-blue-300">{totals.meetings}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500">Beleske</div>
          <div className="text-xl font-bold text-emerald-300">{totals.notes}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500">Dogovori</div>
          <div className="text-xl font-bold text-green-300">{totals.deals}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500">Ukupno akcija</div>
          <div className="text-xl font-bold text-gray-100">{totals.total_actions}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500">Leadovi</div>
          <div className="text-xl font-bold text-gray-100">{totals.leads_touched}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700" style={{ backgroundColor: '#1e293b' }}>
                <th className="text-left px-4 py-3 font-semibold text-gray-300">Korisnik</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Pozivi</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Sastanci</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Beleske</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Status promene</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Dogovori</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Ukupno akcija</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Leadovi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Ucitavanje...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Nema aktivnosti u izabranom periodu</td></tr>
              )}
              {rows.map(r => (
                <tr
                  key={r.user_id}
                  className="hover:bg-gray-700/50 cursor-pointer transition"
                  onClick={() => openDrill(r)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-100">{r.display_name || r.username}</div>
                    <div className="text-xs text-gray-500">{r.username}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-300 font-medium">{r.calls || 0}</td>
                  <td className="px-4 py-3 text-right text-blue-300 font-medium">{r.meetings || 0}</td>
                  <td className="px-4 py-3 text-right text-emerald-300 font-medium">{r.notes || 0}</td>
                  <td className="px-4 py-3 text-right text-purple-300 font-medium">{r.status_changes || 0}</td>
                  <td className="px-4 py-3 text-right text-green-300 font-medium">{r.deals || 0}</td>
                  <td className="px-4 py-3 text-right text-gray-100 font-semibold">{r.total_actions || 0}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{r.leads_touched || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down drawer */}
      {drillUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end" onClick={() => setDrillUser(null)}>
          <div
            className="w-full max-w-xl h-full bg-gray-800 shadow-2xl overflow-y-auto border-l border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-100">{drillUser.display_name || drillUser.username}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Aktivnost po danu</p>
              </div>
              <button onClick={() => setDrillUser(null)} className="text-gray-500 hover:text-gray-300 text-2xl leading-none">&times;</button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4 flex items-center gap-2">
                <label className="text-xs text-gray-400">Datum</label>
                <input
                  type="date"
                  value={drillDate}
                  onChange={e => changeDrillDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {drillLoading && <div className="text-gray-500 text-sm">Ucitavanje...</div>}
              {!drillLoading && (!drillData || drillData.length === 0) && (
                <div className="text-gray-500 text-sm py-8 text-center">Nema aktivnosti za izabrani dan</div>
              )}

              {!drillLoading && drillData && drillData.length > 0 && (
                <div className="space-y-3">
                  {drillData.map((group, idx) => {
                    const lead = group.lead || {}
                    const activities = Array.isArray(group.activities) ? group.activities : []
                    return (
                      <div key={lead.id || idx} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        {/* Lead header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-700/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xl flex-shrink-0">{CATEGORY_ICONS[lead.category] || '📌'}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-100 truncate">
                                {lead.name || 'Nepoznat lead'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {lead.city || 'Bez grada'}
                                {lead.subcategory && ` · ${lead.subcategory}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {lead.outreach_status && (
                              <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[11px] bg-gray-700 text-gray-300">
                                {STATUS_LABELS[lead.outreach_status] || lead.outreach_status}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-900/40 text-emerald-300 border border-emerald-800">
                              {activities.length}
                            </span>
                          </div>
                        </div>

                        {/* Activities list */}
                        <div className="divide-y divide-gray-700/60">
                          {activities.map(a => {
                            const type = a.action_type || 'system'
                            const t = a.created_at
                              ? new Date(a.created_at + 'Z').toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })
                              : ''
                            return (
                              <div key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                                <div className="text-xs text-gray-500 font-mono w-12 flex-shrink-0 pt-0.5">
                                  {t}
                                </div>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium flex-shrink-0 ${ACTION_COLORS[type] || ACTION_COLORS.system}`}>
                                  <span>{ACTION_ICONS[type] || '⚙️'}</span>
                                  <span>{ACTION_TYPE_LABELS[type] || type}</span>
                                </div>
                                {a.details && (
                                  <div className="text-xs text-gray-300 leading-relaxed flex-1 min-w-0 pt-0.5">
                                    {prettifyDetails(a.details)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
