import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LeadTable from './components/LeadTable'
import LeadModal from './components/LeadModal'
import AddLeadModal from './components/AddLeadModal'
import Sidebar from './components/Sidebar'
import CalendarView from './components/CalendarView'
import DailyActivityView from './components/DailyActivityView'
import CustomersView from './components/CustomersView'
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Default to Customers view on mobile (the main mobile use case)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && view === 'dashboard') {
      setView('customers')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Friendly title for mobile top bar
  const viewTitle = (() => {
    if (view === 'dashboard') return 'Dashboard'
    if (view === 'calendar') return 'Kalendar'
    if (view === 'daily-activity') return 'Dnevna aktivnost'
    if (view === 'customers') return 'Kupci'
    if (view === 'leads') {
      if (filters.category === 'hotel') return 'Hoteli'
      if (filters.category === 'klinika') return 'Klinike'
      if (filters.category === 'investitor') return 'Investitori'
      if (filters.category === 'prodavac') return 'Prodavci'
      return 'Svi leadovi'
    }
    return 'Enza Home'
  })()

  // These views are dense/complex and not designed for phone screens
  const desktopOnlyViews = new Set(['dashboard', 'leads', 'calendar'])
  const isDesktopOnlyView = desktopOnlyViews.has(view)

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
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto">
        {/* Mobile top bar — hamburger + current view title */}
        <div className="md:hidden sticky top-0 z-30 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="text-gray-300 hover:text-white p-1 -ml-1"
            aria-label="Otvori meni"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-100 truncate">{viewTitle}</h1>
          <div className="w-6" />
        </div>

        {/* Desktop-only banner shown on mobile */}
        {isDesktopOnlyView && (
          <div className="md:hidden p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">💻</div>
              <h2 className="text-base font-semibold text-gray-100 mb-2">Strana je optimizovana za desktop</h2>
              <p className="text-sm text-gray-400 mb-5">
                {viewTitle} sadrzi puno detalja i najbolje radi na vecem ekranu. Otvori je sa racunara.
              </p>
              <button
                onClick={() => setView('customers')}
                className="px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition"
              >
                🛍️ Otvori Kupce
              </button>
              <button
                onClick={() => setView('daily-activity')}
                className="ml-2 px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 transition"
              >
                📊 Dnevna aktivnost
              </button>
            </div>
          </div>
        )}

        {/* Wrap actual views — hide desktop-only ones on mobile */}
        <div className={isDesktopOnlyView ? 'hidden md:block' : ''}>
          {view === 'dashboard' ? (
            <Dashboard stats={stats} setCategory={setCategory} leads={leads} fetchLeads={() => { setFilters({ category: '', subcategory: '', outreach_status: '', search: '', investor_size: '', construction_phase: '', city: '', has_phone: '', has_email: '', verified: '' }); fetchLeads(); }} />
          ) : view === 'calendar' ? (
            <CalendarView onSelectLead={(lead) => {
              if (lead.id) {
                fetch(`/api/leads/${lead.id}`, { credentials: 'include' }).then(r => r.json()).then(setSelectedLead).catch(console.error)
              }
            }} />
          ) : view === 'daily-activity' ? (
            <DailyActivityView onSelectLead={setSelectedLead} />
          ) : view === 'customers' ? (
            <CustomersView />
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
        </div>
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
