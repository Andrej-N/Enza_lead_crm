import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LeadTable from './components/LeadTable'
import LeadModal from './components/LeadModal'
import AddLeadModal from './components/AddLeadModal'
import Sidebar from './components/Sidebar'
import CalendarView from './components/CalendarView'
import DailyActivityView from './components/DailyActivityView'
import CustomersView from './components/CustomersView'
import MyLeadsView from './components/MyLeadsView'
import LoginPage from './components/LoginPage'
import LeadFilters from './components/LeadFilters'
import AdminPanel from './components/AdminPanel'
import ChangePasswordModal from './components/ChangePasswordModal'

const API = '/api'

function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({ total: 0, byCategory: {}, byStatus: {} })
  const [filters, setFilters] = useState({ category: '', subcategory: '', outreach_status: '', search: '', investor_size: '', construction_phase: '', city: '', has_phone: '', has_email: '', verified: '', assigned_to: '' })
  const [selectedLead, setSelectedLead] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('admin')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [notif, setNotif] = useState({ total: 0, newCount: 0 })

  const isAdmin = user?.role === 'admin'

  // Adjust default view based on role and screen size
  useEffect(() => {
    if (!user) return
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (user.role === 'admin') {
      setView(v => (v === 'admin' || v === 'dashboard') ? (isMobile ? 'my-leads' : 'admin') : v)
    } else {
      // Non-admin: force off admin/dashboard/daily-activity
      setView(v => {
        if (v === 'admin' || v === 'dashboard' || v === 'daily-activity') {
          return 'my-leads'
        }
        return v
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Poll notification count every 60s
  const fetchNotif = async () => {
    try {
      const res = await fetch(`${API}/my/notifications`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      if (data && typeof data === 'object') {
        setNotif({ total: data.total || 0, newCount: data.newCount || 0 })
      }
    } catch (err) { /* ignore */ }
  }

  useEffect(() => {
    if (!user) return
    fetchNotif()
    const id = setInterval(fetchNotif, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const markNotifSeen = async () => {
    try {
      await fetch(`${API}/my/notifications/seen`, { method: 'POST', credentials: 'include' })
      setNotif(n => ({ ...n, newCount: 0 }))
    } catch (err) { /* ignore */ }
  }

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
    // /api/stats is admin-only — non-admins keep the empty initial state
    if (!user || user.role !== 'admin') return
    try {
      const res = await fetch(`${API}/stats`, { credentials: 'include' })
      if (res.status === 401) { setUser(null); return }
      if (!res.ok) return // 403 or 500 — keep prior stats, don't overwrite
      const data = await res.json()
      if (data && typeof data === 'object' && data.byCategory && data.byStatus) {
        setStats(data)
      }
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
    if (view === 'admin') return 'Admin Panel'
    if (view === 'dashboard') return 'Dashboard'
    if (view === 'calendar') return 'Kalendar'
    if (view === 'daily-activity') return 'Dnevna aktivnost'
    if (view === 'customers') return 'Kupci'
    if (view === 'my-leads') return 'Moji leadovi'
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
  const desktopOnlyViews = new Set(['dashboard', 'leads', 'calendar', 'admin'])
  const isDesktopOnlyView = desktopOnlyViews.has(view)

  const resetFiltersAndFetch = () => {
    setFilters({ category: '', subcategory: '', outreach_status: '', search: '', investor_size: '', construction_phase: '', city: '', has_phone: '', has_email: '', verified: '', assigned_to: '' })
    fetchLeads()
  }

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
        onChangePassword={() => setShowChangePassword(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        notif={notif}
      />

      <main className="flex-1 overflow-auto">
        {/* Mobile top bar — hamburger + current view title */}
        <div className="md:hidden sticky top-0 z-30 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="relative text-gray-300 hover:text-white p-1 -ml-1"
            aria-label="Otvori meni"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {notif.newCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-gray-800" />
            )}
          </button>
          <h1 className="text-sm font-semibold text-gray-100 truncate">{viewTitle}</h1>
          {notif.newCount > 0 ? (
            <button
              onClick={() => setView('my-leads')}
              className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded-full animate-pulse"
            >
              {notif.newCount > 9 ? '9+' : notif.newCount} nov{notif.newCount === 1 ? '' : 'i'}
            </button>
          ) : (
            <div className="w-6" />
          )}
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
          {view === 'admin' && isAdmin ? (
            <AdminPanel
              stats={stats}
              setCategory={setCategory}
              leads={leads}
              onSelectLead={setSelectedLead}
              resetFiltersAndFetch={resetFiltersAndFetch}
            />
          ) : view === 'dashboard' && isAdmin ? (
            <Dashboard stats={stats} setCategory={setCategory} leads={leads} fetchLeads={resetFiltersAndFetch} />
          ) : view === 'calendar' ? (
            <CalendarView onSelectLead={(lead) => {
              if (lead.id) {
                fetch(`/api/leads/${lead.id}`, { credentials: 'include' }).then(r => r.json()).then(setSelectedLead).catch(console.error)
              }
            }} />
          ) : view === 'daily-activity' && isAdmin ? (
            <DailyActivityView onSelectLead={setSelectedLead} />
          ) : view === 'customers' ? (
            <CustomersView />
          ) : view === 'my-leads' ? (
            <MyLeadsView
              user={user}
              defaultMine={true}
              onMarkSeen={markNotifSeen}
              onSelectLead={(lead) => {
                if (lead.id) {
                  fetch(`${API}/leads/${lead.id}`, { credentials: 'include' })
                    .then(r => r.json())
                    .then(setSelectedLead)
                    .catch(console.error)
                }
              }}
            />
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

              <LeadFilters filters={filters} setFilters={setFilters} isAdmin={isAdmin} />

              <LeadTable
                leads={leads}
                loading={loading}
                category={filters.category}
                onSelect={setSelectedLead}
                onUpdateStatus={(id, status) => updateLead(id, { outreach_status: status })}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </main>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          isAdmin={isAdmin}
          canEdit={isAdmin || selectedLead.assigned_to === user?.id}
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

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}

export default App
