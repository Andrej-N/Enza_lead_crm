import { useState, useEffect } from 'react'

const STATUS_OPTIONS = [
  ['', 'Svi statusi', 'bg-gray-600'],
  ['not_contacted', 'Nije kontaktiran', 'bg-gray-500'],
  ['called', 'Pozvan', 'bg-yellow-500'],
  ['meeting_scheduled', 'Zakazan sastanak', 'bg-blue-600'],
  ['negotiation', 'Pregovori', 'bg-purple-600'],
  ['deal_closed', 'Dogovoren posao', 'bg-green-600'],
  ['not_interested', 'Nije zainteresovan', 'bg-red-500'],
]

const HOTEL_SUBCATEGORIES = ['', 'Luksuzni 5*', 'Luksuzni 4-5*', 'Premium 4*', 'Srednji 3-4*', 'Srednji 3*', 'Budget 2-3*', 'U Izgradnji', 'Apartmani', 'Hosteli']

const INVESTOR_SIZES = [['', 'Svi'], ['mali', 'Mali (<2000m\u00B2)'], ['srednji', 'Srednji (2-5k m\u00B2)'], ['veliki', 'Veliki (5000+ m\u00B2)']]

const CONSTRUCTION_PHASES = ['', 'U izgradnji', 'Priprema', 'Planiranje', 'Aktivni']

const CITIES = [
  ['', 'Svi gradovi'], ['Beograd', 'Beograd'], ['Novi Sad', 'Novi Sad'],
  ['Vrnjacka Banja', 'Vrnjačka Banja'], ['Kopaonik', 'Kopaonik'], ['Nis', 'Niš'],
  ['Subotica', 'Subotica'], ['Zlatibor', 'Zlatibor'], ['Cacak', 'Čačak'],
  ['Kraljevo', 'Kraljevo'], ['Vrdnik', 'Vrdnik']
]

const KNOWN_CITIES = CITIES.map(c => c[0])

export default function LeadFilters({ filters, setFilters, isAdmin = false, users: usersProp = null }) {
  const [showMore, setShowMore] = useState(false)
  const [users, setUsers] = useState(usersProp || [])

  useEffect(() => {
    if (usersProp) { setUsers(usersProp); return }
    if (!isAdmin) return
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUsers(Array.isArray(data) ? data.filter(u => u.active) : []))
      .catch(() => setUsers([]))
  }, [isAdmin, usersProp])

  const activeFilterCount = [
    filters.city,
    filters.has_phone,
    filters.has_email,
    filters.verified,
    filters.subcategory,
    filters.investor_size,
    filters.construction_phase,
    isAdmin ? filters.assigned_to : '',
  ].filter(Boolean).length

  const activeChips = []
  if (filters.outreach_status) {
    const s = STATUS_OPTIONS.find(([v]) => v === filters.outreach_status)
    if (s) activeChips.push({ label: s[1], key: 'outreach_status' })
  }
  if (filters.city) activeChips.push({ label: `Grad: ${filters.city}`, key: 'city' })
  if (filters.subcategory) activeChips.push({ label: filters.subcategory, key: 'subcategory' })
  if (filters.investor_size) {
    const s = INVESTOR_SIZES.find(([v]) => v === filters.investor_size)
    if (s) activeChips.push({ label: s[1], key: 'investor_size' })
  }
  if (filters.construction_phase) activeChips.push({ label: `Faza: ${filters.construction_phase}`, key: 'construction_phase' })
  if (filters.has_phone) activeChips.push({ label: filters.has_phone === '1' ? 'Ima telefon' : 'Nema telefon', key: 'has_phone' })
  if (filters.has_email) activeChips.push({ label: filters.has_email === '1' ? 'Ima email' : 'Nema email', key: 'has_email' })
  if (filters.verified) {
    const labels = { all: 'Potpuno verifikovani', phone: 'Verif. telefon', email: 'Verif. email', none: 'Neverifikovani' }
    activeChips.push({ label: labels[filters.verified], key: 'verified' })
  }
  if (isAdmin && filters.assigned_to) {
    let label = 'Dodeljen'
    if (filters.assigned_to === 'unassigned') label = 'Neraspoređeni'
    else {
      const u = users.find(x => String(x.id) === String(filters.assigned_to))
      if (u) label = `Dodeljen: ${u.display_name || u.username}`
    }
    activeChips.push({ label, key: 'assigned_to' })
  }

  const clearFilter = (key) => {
    setFilters(f => ({ ...f, [key]: '' }))
  }

  const clearAll = () => {
    setFilters(f => ({
      ...f,
      outreach_status: '', city: '', has_phone: '', has_email: '',
      verified: '', subcategory: '', investor_size: '', construction_phase: '', search: '',
      ...(isAdmin ? { assigned_to: '' } : {})
    }))
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Pretrazi po imenu, emailu, telefonu, projektu..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-700 rounded-lg text-sm bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Status pills - always visible */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(([val, label, activeColor]) => (
          <button
            key={val}
            onClick={() => setFilters(f => ({ ...f, outreach_status: val }))}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filters.outreach_status === val
                ? `${activeColor} text-white shadow-sm`
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category-specific sub-filters - always visible when relevant */}
      {filters.category === 'hotel' && (
        <div className="flex flex-wrap gap-1.5">
          {HOTEL_SUBCATEGORIES.map(sub => (
            <button
              key={sub}
              onClick={() => setFilters(f => ({ ...f, subcategory: sub }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.subcategory === sub
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {sub || 'Sve kategorije'}
            </button>
          ))}
        </div>
      )}

      {filters.category === 'investitor' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {INVESTOR_SIZES.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilters(f => ({ ...f, investor_size: val }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.investor_size === val
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="w-px h-5 bg-gray-600 mx-1" />
          <select
            value={filters.construction_phase}
            onChange={e => setFilters(f => ({ ...f, construction_phase: e.target.value }))}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-600 bg-gray-700 text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Sve faze gradnje</option>
            {CONSTRUCTION_PHASES.filter(Boolean).map(phase => (
              <option key={phase} value={phase}>{phase}</option>
            ))}
          </select>
        </div>
      )}

      {/* "More filters" toggle + active chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowMore(!showMore)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            showMore || activeFilterCount > 0
              ? 'border-emerald-700 bg-emerald-900/30 text-emerald-400'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filteri
          {activeFilterCount > 0 && (
            <span className="bg-emerald-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Active filter chips */}
        {activeChips.map(chip => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-700 text-gray-200 font-medium"
          >
            {chip.label}
            <button
              onClick={() => clearFilter(chip.key)}
              className="hover:text-red-400 transition ml-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {activeChips.length > 1 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-400 hover:text-red-300 transition font-medium"
          >
            Resetuj sve
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {showMore && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
          {/* Row 1: City + Contact */}
          <div className="grid grid-cols-2 gap-4">
            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Grad</label>
              <select
                value={KNOWN_CITIES.includes(filters.city) ? filters.city : '__custom'}
                onChange={e => {
                  if (e.target.value === '__custom') return
                  setFilters(f => ({ ...f, city: e.target.value }))
                }}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CITIES.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
                <option value="__custom">Drugi grad...</option>
              </select>
              {!KNOWN_CITIES.includes(filters.city) && filters.city && (
                <input
                  type="text"
                  placeholder="Unesite grad..."
                  value={filters.city}
                  onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              )}
            </div>

            {/* Verification */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Verifikacija</label>
              <select
                value={filters.verified}
                onChange={e => setFilters(f => ({ ...f, verified: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Svi</option>
                <option value="all">Potpuno verifikovani</option>
                <option value="phone">Verifikovan telefon</option>
                <option value="email">Verifikovan email</option>
                <option value="none">Neverifikovani</option>
              </select>
            </div>
          </div>

          {/* Row 2: Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Telefon</label>
              <select
                value={filters.has_phone}
                onChange={e => setFilters(f => ({ ...f, has_phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Svi</option>
                <option value="1">Ima telefon</option>
                <option value="0">Nema telefon</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <select
                value={filters.has_email}
                onChange={e => setFilters(f => ({ ...f, has_email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Svi</option>
                <option value="1">Ima email</option>
                <option value="0">Nema email</option>
              </select>
            </div>
          </div>

          {/* Row 3: Assigned (admin only) */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Dodeljen</label>
              <select
                value={filters.assigned_to || ''}
                onChange={e => setFilters(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-600 bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Svi</option>
                <option value="unassigned">Neraspoređeni</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
