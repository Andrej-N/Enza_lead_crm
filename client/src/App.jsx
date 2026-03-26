import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LeadTable from './components/LeadTable'
import LeadModal from './components/LeadModal'
import AddLeadModal from './components/AddLeadModal'
import Sidebar from './components/Sidebar'
import CalendarView from './components/CalendarView'
import LoginPage from './components/LoginPage'

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
    <div className="flex h-screen bg-gray-50">
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
              <h1 className="text-2xl font-bold text-gray-800">
                {filters.category === 'hotel' && 'Hoteli'}
                {filters.category === 'klinika' && 'Privatne Klinike'}
                {filters.category === 'investitor' && 'Investitori'}
                {filters.category === 'prodavac' && 'Prodavci Namestaja'}
                {!filters.category && 'Svi Leadovi'}
                <span className="ml-2 text-sm font-normal text-gray-500">({leads.length})</span>
              </h1>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
              >
                + Dodaj Lead
              </button>
            </div>

            {/* Sub-filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.category === 'hotel' && (
                <>
                  {['', 'Luksuzni 5*', 'Luksuzni 4-5*', 'Premium 4*', 'Srednji 3-4*', 'Srednji 3*', 'Budget 2-3*', 'U Izgradnji', 'Apartmani', 'Hosteli'].map(sub => (
                    <button key={sub} onClick={() => setFilters(f => ({ ...f, subcategory: sub }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${filters.subcategory === sub ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
                      {sub || 'Svi'}
                    </button>
                  ))}
                </>
              )}
              {filters.category === 'investitor' && (
                <>
                  <div className="flex gap-2 mr-4">
                    {[['', 'Svi'], ['mali', 'Mali (<2000m\u00B2)'], ['srednji', 'Srednji (2-5k m\u00B2)'], ['veliki', 'Veliki (5000+ m\u00B2)']].map(([val, label]) => (
                      <button key={val} onClick={() => setFilters(f => ({ ...f, investor_size: val }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${filters.investor_size === val ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <select
                    value={filters.construction_phase}
                    onChange={e => setFilters(f => ({ ...f, construction_phase: e.target.value }))}
                    className="px-3 py-1 rounded-lg text-xs border bg-white text-gray-600"
                  >
                    <option value="">Sve faze gradnje</option>
                    <option value="U izgradnji">U izgradnji</option>
                    <option value="Priprema">Priprema</option>
                    <option value="Planiranje">Planiranje</option>
                    <option value="Aktivni">Aktivni projekti</option>
                  </select>
                </>
              )}
            </div>

            {/* Status filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                ['', 'Svi statusi'],
                ['not_contacted', 'Nije kontaktiran'],
                ['called', 'Pozvan'],
                ['meeting_scheduled', 'Zakazan sastanak'],
                ['negotiation', 'Pregovori'],
                ['deal_closed', 'Dogovoren posao'],
                ['not_interested', 'Nije zainteresovan'],
              ].map(([val, label]) => (
                <button key={val} onClick={() => setFilters(f => ({ ...f, outreach_status: val }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${filters.outreach_status === val
                    ? val === 'deal_closed' ? 'bg-green-600 text-white'
                      : val === 'meeting_scheduled' ? 'bg-blue-600 text-white'
                      : val === 'called' ? 'bg-yellow-500 text-white'
                      : val === 'negotiation' ? 'bg-purple-600 text-white'
                      : val === 'not_interested' ? 'bg-red-500 text-white'
                      : 'bg-gray-600 text-white'
                    : 'bg-white text-gray-500 border hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* City filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-gray-400 self-center mr-1">Grad:</span>
              {[['', 'Svi gradovi'], ['Beograd', 'Beograd'], ['Novi Sad', 'Novi Sad'], ['Vrnjacka Banja', 'Vrnjačka Banja'], ['Kopaonik', 'Kopaonik'], ['Nis', 'Niš'], ['Subotica', 'Subotica'], ['Zlatibor', 'Zlatibor'], ['Cacak', 'Čačak'], ['Kraljevo', 'Kraljevo'], ['Vrdnik', 'Vrdnik']].map(([val, label]) => (
                <button key={val} onClick={() => setFilters(f => ({ ...f, city: val }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${filters.city === val
                    ? 'bg-teal-600 text-white' : 'bg-white text-gray-500 border hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
              <input
                type="text"
                placeholder="Drugi grad..."
                value={!['', 'Beograd', 'Novi Sad', 'Vrnjacka Banja', 'Kopaonik', 'Nis', 'Subotica', 'Zlatibor', 'Cacak', 'Kraljevo', 'Vrdnik'].includes(filters.city) ? filters.city : ''}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                className="px-3 py-1 rounded-full text-xs border w-28 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Contact availability filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-gray-400 self-center mr-1">Kontakt:</span>
              {[
                ['has_phone', '', 'Svi telefoni'],
                ['has_phone', '1', 'Ima telefon'],
                ['has_phone', '0', 'Nema telefon'],
              ].map(([field, val, label]) => (
                <button key={`${field}-${val}`} onClick={() => setFilters(f => ({ ...f, [field]: val }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${filters[field] === val
                    ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 border hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
              <span className="text-gray-300 self-center mx-1">|</span>
              {[
                ['has_email', '', 'Svi emailovi'],
                ['has_email', '1', 'Ima email'],
                ['has_email', '0', 'Nema email'],
              ].map(([field, val, label]) => (
                <button key={`${field}-${val}`} onClick={() => setFilters(f => ({ ...f, [field]: val }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${filters[field] === val
                    ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 border hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Verification filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-gray-400 self-center mr-1">Verifikacija:</span>
              {[
                ['', 'Svi'],
                ['all', 'Potpuno verifikovani'],
                ['phone', 'Verifikovan telefon'],
                ['email', 'Verifikovan email'],
                ['none', 'Neverifikovani'],
              ].map(([val, label]) => (
                <button key={val} onClick={() => setFilters(f => ({ ...f, verified: val }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${filters.verified === val
                    ? val === 'all' ? 'bg-green-600 text-white'
                      : val === 'none' ? 'bg-red-500 text-white'
                      : 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-500 border hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Pretrazi po imenu, emailu, telefonu, projektu..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

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
