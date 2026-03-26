const STATUS_LABELS = {
  not_contacted: 'Nije kontaktiran',
  called: 'Pozvan',
  meeting_scheduled: 'Zakazan sastanak',
  negotiation: 'Pregovori',
  deal_closed: 'Dogovoren posao',
  not_interested: 'Nije zainteresovan',
}

const CATEGORY_CONFIG = {
  hotel: { label: 'Hoteli', icon: '🏨', color: 'text-blue-600' },
  klinika: { label: 'Klinike', icon: '🏥', color: 'text-rose-600' },
  investitor: { label: 'Investitori', icon: '🏗️', color: 'text-orange-600' },
  prodavac: { label: 'Prodavci', icon: '🛋️', color: 'text-violet-600' },
}

export default function Sidebar({ filters, setFilters, setCategory, stats, view, setView, user, onLogout }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Enza Home</h1>
        <p className="text-xs text-gray-500 mt-1">Lead Database</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <button
          onClick={() => { setView('dashboard'); setFilters(f => ({ ...f, category: '' })) }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${view === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Dashboard
        </button>

        <button
          onClick={() => setView('calendar')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${view === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <span>📅</span> Kalendar
        </button>

        <div className="pt-3 pb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Kategorije
        </div>

        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-between ${
              view === 'leads' && filters.category === key ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>
              <span className="mr-2">{cfg.icon}</span>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">{stats.byCategory[key] || 0}</span>
          </button>
        ))}

        <button
          onClick={() => { setCategory(''); setView('leads') }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
            view === 'leads' && !filters.category ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Svi Leadovi
          <span className="text-xs text-gray-400 ml-2">{stats.total}</span>
        </button>

        {/* Status summary */}
        <div className="pt-4 pb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Status pregled
        </div>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between px-3 py-1 text-xs text-gray-500">
            <span>{label}</span>
            <span className="font-medium">{stats.byStatus[key] || 0}</span>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-400 mb-2">Ukupno leadova: {stats.total}</div>
        {user && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">{user.displayName || user.username}</span>
            <button
              onClick={onLogout}
              className="text-xs text-red-400 hover:text-red-600 transition"
            >
              Odjavi se
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
