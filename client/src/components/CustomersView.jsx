import { useState, useEffect, useMemo } from 'react'
import CustomerModal from './CustomerModal'

export default function CustomersView() {
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({ total: 0, withEmail: 0, withConsent: 0, thisMonth: 0 })
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: '', city: '', has_email: '', has_consent: '', from_date: '', to_date: ''
  })
  const [modalCustomer, setModalCustomer] = useState(null) // null = closed, {} = new, {id: ...} = edit

  const fetchCustomers = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    try {
      const res = await fetch(`/api/customers?${params}`, { credentials: 'include' })
      if (!res.ok) { setCustomers([]); return }
      const data = await res.json()
      setCustomers(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
      setCustomers([])
    }
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/customers/stats', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch customer stats:', err)
    }
  }

  useEffect(() => { fetchCustomers() }, [filters])
  useEffect(() => { fetchStats() }, [])

  const saveCustomer = async (formData) => {
    try {
      if (modalCustomer && modalCustomer.id) {
        // Update
        await fetch(`/api/customers/${modalCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        })
      } else {
        // Create
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        })
      }
      setModalCustomer(null)
      fetchCustomers()
      fetchStats()
    } catch (err) {
      console.error('Failed to save customer:', err)
      alert('Greska prilikom cuvanja')
    }
  }

  const deleteCustomer = async (id) => {
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE', credentials: 'include' })
      setModalCustomer(null)
      fetchCustomers()
      fetchStats()
    } catch (err) {
      console.error('Failed to delete customer:', err)
    }
  }

  const openEdit = async (customerId) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, { credentials: 'include' })
      const data = await res.json()
      if (data && data.id) setModalCustomer(data)
    } catch (err) {
      console.error('Failed to load customer:', err)
    }
  }

  const exportCSV = (consentOnly) => {
    const url = `/api/customers/export.csv${consentOnly ? '?consent_only=1' : ''}`
    window.open(url, '_blank')
  }

  const hasActiveFilters = useMemo(() =>
    Object.values(filters).some(v => v !== ''), [filters])

  const clearFilters = () => setFilters({ search: '', city: '', has_email: '', has_consent: '', from_date: '', to_date: '' })

  return (
    <div className="p-4 md:p-6 max-w-7xl pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-5 md:mb-6 md:flex md:items-start md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-100">Kupci</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">Walk-in kupci iz radnje · baza za email kampanje</p>
        </div>
        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-2 mt-3 md:mt-0">
          <button
            onClick={() => exportCSV(true)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition"
            title="Preuzmi samo kupce sa saglasnosti (za email kampanje)"
          >
            📥 CSV (sa saglasnosti)
          </button>
          <button
            onClick={() => exportCSV(false)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition"
            title="Preuzmi sve kupce"
          >
            📥 CSV (svi)
          </button>
          <button
            onClick={() => setModalCustomer({})}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
          >
            + Dodaj kupca
          </button>
        </div>
      </div>

      {/* KPI cards — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Ukupno</div>
          <div className="text-xl md:text-2xl font-bold text-gray-100">{stats.total}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Sa email-om</div>
          <div className="text-xl md:text-2xl font-bold text-blue-400">{stats.withEmail}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}%
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Za kampanje</div>
          <div className="text-xl md:text-2xl font-bold text-emerald-400">{stats.withConsent}</div>
          <div className="text-xs text-gray-500 mt-0.5">email + saglasnost</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Ovog meseca</div>
          <div className="text-xl md:text-2xl font-bold text-violet-400">{stats.thisMonth}</div>
        </div>
      </div>

      {/* Mobile CSV export buttons */}
      <div className="md:hidden mb-4 flex gap-2">
        <button
          onClick={() => exportCSV(true)}
          className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs transition"
        >
          📥 CSV (saglasnost)
        </button>
        <button
          onClick={() => exportCSV(false)}
          className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs transition"
        >
          📥 CSV (svi)
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 md:p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Pretraga</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Ime, telefon, email, proizvod..."
              className="w-full px-3 py-2 md:py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Grad</label>
            <input
              type="text"
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              className="w-full px-3 py-2 md:py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 md:block gap-3 md:gap-0">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <select
                value={filters.has_email}
                onChange={e => setFilters(f => ({ ...f, has_email: e.target.value }))}
                className="w-full px-3 py-2 md:py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Svi</option>
                <option value="1">Sa email-om</option>
                <option value="0">Bez email-a</option>
              </select>
            </div>
            <div className="md:hidden">
              <label className="block text-xs font-medium text-gray-500 mb-1">Saglasnost</label>
              <select
                value={filters.has_consent}
                onChange={e => setFilters(f => ({ ...f, has_consent: e.target.value }))}
                className="w-full px-3 py-2 md:py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Svi</option>
                <option value="1">Sa saglasnosti</option>
                <option value="0">Bez saglasnosti</option>
              </select>
            </div>
          </div>
          <div className="hidden md:block">
            <label className="block text-xs font-medium text-gray-500 mb-1">Saglasnost</label>
            <select
              value={filters.has_consent}
              onChange={e => setFilters(f => ({ ...f, has_consent: e.target.value }))}
              className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Svi</option>
              <option value="1">Sa saglasnosti</option>
              <option value="0">Bez saglasnosti</option>
            </select>
          </div>
          <div className="hidden md:block">
            <label className="block text-xs font-medium text-gray-500 mb-1">Od datuma</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
              className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-200 transition"
            >
              Ocisti filtere
            </button>
          </div>
        )}
      </div>

      {/* List — table on desktop, cards on mobile */}
      {loading ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl py-16 text-center text-gray-500 text-sm">Ucitavanje...</div>
      ) : customers.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl py-16 text-center">
          <div className="text-4xl mb-2">🛍️</div>
          <div className="text-gray-400 text-sm">
            {hasActiveFilters ? 'Nema rezultata za zadate filtere' : 'Jos uvek nema unetih kupaca'}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Ime</th>
                  <th className="px-4 py-3">Kontakt</th>
                  <th className="px-4 py-3">Grad</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Kupljeno</th>
                  <th className="px-4 py-3">Iznos</th>
                  <th className="px-4 py-3 text-center">Saglasnost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => openEdit(c.id)}
                    className="hover:bg-gray-700/40 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="text-gray-100 font-medium">{c.name}</div>
                      {c.created_by_name && (
                        <div className="text-xs text-gray-500 mt-0.5">Uneo: {c.created_by_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.phone && <div className="text-gray-300 text-xs">{c.phone}</div>}
                      {c.email && <div className="text-gray-400 text-xs">{c.email}</div>}
                      {!c.phone && !c.email && <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{c.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{c.purchase_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-xs truncate" title={c.products || ''}>
                      {c.products || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                      {c.purchase_value || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.marketing_consent ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-800">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-700/60 text-gray-500 border border-gray-700">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {customers.map(c => (
              <button
                key={c.id}
                onClick={() => openEdit(c.id)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3.5 text-left hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-100 truncate">{c.name}</div>
                    {c.city && <div className="text-xs text-gray-500 mt-0.5">{c.city}</div>}
                  </div>
                  {c.marketing_consent ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-800 flex-shrink-0">
                      ✓ saglasnost
                    </span>
                  ) : null}
                </div>

                {(c.phone || c.email) && (
                  <div className="space-y-0.5 mb-2">
                    {c.phone && <div className="text-xs text-gray-300">📞 {c.phone}</div>}
                    {c.email && <div className="text-xs text-gray-400 truncate">✉️ {c.email}</div>}
                  </div>
                )}

                {c.products && (
                  <div className="text-xs text-gray-400 line-clamp-2 mb-2">{c.products}</div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700/60">
                  <span>{c.purchase_date || '—'}</span>
                  <span className="text-gray-300 font-medium">{c.purchase_value || '—'}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mobile floating "+ Add" button */}
      <button
        onClick={() => setModalCustomer({})}
        className="md:hidden fixed bottom-5 right-5 z-30 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition"
        aria-label="Dodaj kupca"
      >
        +
      </button>

      {/* Modal */}
      {modalCustomer !== null && (
        <CustomerModal
          customer={modalCustomer}
          onClose={() => setModalCustomer(null)}
          onSave={saveCustomer}
          onDelete={deleteCustomer}
        />
      )}
    </div>
  )
}
