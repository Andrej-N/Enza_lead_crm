import { useState, useEffect } from 'react'
import LeadTable from './LeadTable'
import LeadFilters from './LeadFilters'
import LeadModal from './LeadModal'

const CATEGORY_TABS = [
  { key: '', label: 'Svi', icon: '📋' },
  { key: 'hotel', label: 'Hoteli', icon: '🏨' },
  { key: 'klinika', label: 'Klinike', icon: '🏥' },
  { key: 'investitor', label: 'Investitori', icon: '🏗️' },
  { key: 'prodavac', label: 'Prodavci', icon: '🛋️' },
]

export default function AdminAssignmentTab() {
  const [leads, setLeads] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    category: '', subcategory: '', outreach_status: '', search: '',
    investor_size: '', construction_phase: '', city: '',
    has_phone: '', has_email: '', verified: '', assigned_to: ''
  })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [assignTo, setAssignTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)

  const fetchLeads = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
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

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setUsers(Array.isArray(data) ? data.filter(u => u.active) : [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  useEffect(() => { fetchLeads() }, [filters])
  useEffect(() => { fetchUsers() }, [])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedIds(new Set(leads.map(l => l.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const doAssign = async (userId) => {
    if (selectedIds.size === 0) return
    setBusy(true)
    try {
      await fetch('/api/leads/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lead_ids: Array.from(selectedIds), user_id: userId })
      })
      clearSelection()
      await fetchLeads()
    } catch (err) {
      console.error('Assign failed:', err)
    }
    setBusy(false)
  }

  const handleAssignClick = () => {
    if (!assignTo) return
    doAssign(parseInt(assignTo, 10))
  }

  const handleUnassign = () => {
    doAssign(null)
  }

  const setCategory = (cat) => {
    clearSelection()
    setFilters(f => ({
      ...f,
      category: cat,
      subcategory: '',
      investor_size: '',
      construction_phase: '',
    }))
  }

  // Counts per category from currently fetched leads (without category filter applied,
  // we'd need a separate fetch — simpler: show count of currently visible leads)
  const totalVisible = leads.length

  const updateLead = async (id, fields) => {
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(fields)
    })
    if (selectedLead && selectedLead.id === id) {
      const res = await fetch(`/api/leads/${id}`, { credentials: 'include' })
      const updated = await res.json()
      if (updated.id) setSelectedLead(updated)
    }
    fetchLeads()
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-100">Dodela leadova</h2>
        <p className="text-xs text-gray-500 mt-0.5">Dodeli leadove zaposlenima pojedinacno ili grupno</p>
      </div>

      {/* Category tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map(tab => {
          const active = filters.category === tab.key
          return (
            <button
              key={tab.key || 'all'}
              onClick={() => setCategory(tab.key)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {active && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-800/60">
                  {totalVisible}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <LeadFilters filters={filters} setFilters={setFilters} isAdmin={true} users={users} />

      {/* Assignment bar */}
      <div className={`mb-4 bg-gray-800 border rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap transition ${
        selectedIds.size > 0 ? 'border-emerald-700' : 'border-gray-700'
      }`}>
        <div className="text-sm text-gray-300 font-medium">
          {selectedIds.size > 0 ? (
            <>Izabrano: <span className="text-emerald-400">{selectedIds.size}</span></>
          ) : (
            <span className="text-gray-500">Nijedan lead nije izabran</span>
          )}
        </div>

        {leads.length > 0 && selectedIds.size < leads.length && (
          <button
            onClick={selectAllVisible}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Izaberi sve ({leads.length})
          </button>
        )}
        {selectedIds.size > 0 && (
          <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-200">
            Ocisti izbor
          </button>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <select
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            disabled={selectedIds.size === 0 || busy}
            className="px-3 py-2 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">Izaberi korisnika...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
            ))}
          </select>
          <button
            onClick={handleAssignClick}
            disabled={selectedIds.size === 0 || !assignTo || busy}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Dodeli ({selectedIds.size})
          </button>
          <button
            onClick={handleUnassign}
            disabled={selectedIds.size === 0 || busy}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ukloni dodelu
          </button>
        </div>
      </div>

      <LeadTable
        leads={leads}
        loading={loading}
        category={filters.category}
        onSelect={setSelectedLead}
        onUpdateStatus={(id, status) => updateLead(id, { outreach_status: status })}
        isAdmin={true}
        allowSelect={true}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
      />

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          isAdmin={true}
          onClose={() => setSelectedLead(null)}
          onUpdate={(fields) => { updateLead(selectedLead.id, fields); setSelectedLead({ ...selectedLead, ...fields }) }}
          onDelete={async () => {
            if (!confirm('Da li ste sigurni da zelite da obrisete ovaj lead?')) return
            await fetch(`/api/leads/${selectedLead.id}`, { method: 'DELETE', credentials: 'include' })
            setSelectedLead(null)
            fetchLeads()
          }}
        />
      )}
    </div>
  )
}
