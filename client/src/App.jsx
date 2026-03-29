import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LeadTable from './components/LeadTable'
import LeadModal from './components/LeadModal'
import AddLeadModal from './components/AddLeadModal'
import Sidebar from './components/Sidebar'
import CalendarView from './components/CalendarView'
import LoginPage from './components/LoginPage'
import LeadFilters from './components/LeadFilters'

const API = '/api'

function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({ total: 0, byCategory: {}, byStatus: {} })
  const [filters, setFilters] = useState({ category: '', subcategory: '', outreach_status: '', search: '', investor_size: '', construction_phase: '', city: '', has_phone: '', has_email: '', verified: '' })
  const [selectedLead, setSelectedLead] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('dashboard')

  // Check existing session on mount
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true))
  }, [])

  const fetchLeads = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    try {
      const res = await fetch(`${API}/leads?${params}`, { credentials: 'include' })
      if (res.status === 401) { setUser(null); return }
      const data = await res.json()
      setLeads(data)
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    }
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/stats`, { credentials: 'include' })
      if (res.status === 401) { setUser(null); return }
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  useEffect(() => { if (user) fetchLeads() }, [filters, user])
  useEffect(() => { if (user) fetchStats() }, [user])

  const updateLead = async (id, fields) => {
    await fetch(`${API}/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(fields)
    })
    if (selectedLead && selectedLead.id === id) {
      const res = await fetch(`${API}/leads/${id}`, { credentials: 'include' })
      const updated = await res.json()
      if (updated.id) setSelectedLead(updated)
    }
    fetchLeads(false)
    fetchStats()
  }

  const createLead = async (data) => {
    await fetch(`${API}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    setShowAddModal(false)
    fetchLeads()
    fetchStats()
  }

  const deleteLead = async (id) => {
    if (!confirm('Da li ste sigurni da zelite da obrisete ovaj lead?')) return
    await fetch(`${API}/leads/${id}`, { method: 'DELETE', credentials: 'include' })
    setSelectedLead(null)
    fetchLeads()
    fetchStats()
  }

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  const setCategory = (cat) => {
    setFilters(f => ({ ...f, category: cat, subcategory: '', investor_size: '', construction_phase: '' }))
    setView('leads')
  }

  // Show nothing while checking auth
  if (!authChecked) return null

  // Show login if not authenticated
  if (!user) return <LoginPage onLogin={setUser} />

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        filters={filters}
        setFilters={setFilters}
        setCategory={setCategory}
        stats={stats}
        view={view}
        setView={setView}
        user={user}
        onLogout={logout}
      />

      <main className="flex-1 overflow-auto">
        {view === 'dashboard' ? (
          <Dashboard stats={stats} setCategory={setCategory} leads={leads} fetchLeads={() => { setFilters({ category: '', subcategory: '', outreach_status: '', search: '', investor_size: '', construction_phase: '', city: '', has_phone: '', has_email: '', verified: '' }); fetchLeads(); }} />
        ) : view === 'calendar' ? (
          <CalendarView onSelectLead={(lead) => {
            if (lead.id) {
              fetch(`/api/leads/${lead.id}`, { credentials: 'include' }).then(r => r.json()).then(setSelectedLead).catch(console.error)
            }
          }} />
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-100">
                {filters.category === 'hotel' && 'Hoteli'}
                {filters.category === 'klinika' && 'Privatne Klinike'}
                {filters.category === 'investitor' && 'Investitori'}
                {filters.category === 'prodavac' && 'Prodavci Namestaja'}
                {!filters.category && 'Svi Leadovi'}
                <span className="ml-2 text-sm font-normal text-gray-400">({leads.length})</span>
              </h1>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
              >
                + Dodaj Lead
              </button>
            </div>

            <LeadFilters filters={filters} setFilters={setFilters} />

            <LeadTable
              leads={leads}
              loading={loading}
              category={filters.category}
              onSelect={setSelectedLead}
              onUpdateStatus={(id, status) => updateLead(id, { outreach_status: status })}
            />
          </div>
        )}
      </main>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(fields) => { updateLead(selectedLead.id, fields); setSelectedLead({ ...selectedLead, ...fields }) }}
          onDelete={() => deleteLead(selectedLead.id)}
        />
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreate={createLead}
          category={filters.category}
        />
      )}
    </div>
  )
}

export default App
