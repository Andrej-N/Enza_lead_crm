const STATUS_LABELS = {
  not_contacted: 'Nije kontaktiran',
  called: 'Pozvan',
  meeting_scheduled: 'Zakazan sastanak',
  negotiation: 'Pregovori',
  deal_closed: 'Dogovoren posao',
  not_interested: 'Nije zainteresovan',
}

const CATEGORY_CONFIG = {
  hotel: { label: 'Hoteli', icon: '🏨', color: 'text-blue-400' },
  klinika: { label: 'Klinike', icon: '🏥', color: 'text-rose-400' },
  investitor: { label: 'Investitori', icon: '🏗️', color: 'text-orange-400' },
  prodavac: { label: 'Prodavci', icon: '🛋️', color: 'text-violet-400' },
}

export default function Sidebar({ filters, setFilters, setCategory, stats, view, setView, user, onLogout, onChangePassword, mobileOpen, onMobileClose, notif }) {
  // Helper: wrap any nav action so it also closes the mobile sidebar
  const nav = (fn) => () => { fn(); onMobileClose && onMobileClose() }
  const isAdmin = user?.role === 'admin'
  const newCount = notif?.newCount || 0
  const totalAssigned = notif?.total || 0
  // Defensive: stats may be missing fields if /api/stats failed (e.g. 403 for non-admin)
  const byCategory = stats?.byCategory || {}
  const byStatus = stats?.byStatus || {}
  const total = stats?.total ?? 0

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full
          fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Enza Home</h1>
            <p className="text-xs text-gray-400 mt-1">Lead Database</p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onMobileClose}
            className="md:hidden text-gray-500 hover:text-gray-200 text-2xl leading-none px-2"
            aria-label="Zatvori meni"
          >
            &times;
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isAdmin && (
            <button
              onClick={nav(() => setView('admin'))}
              className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${view === 'admin' ? 'bg-emerald-900/50 text-emerald-400' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              <span>⚙️</span> Admin Panel
            </button>
          )}

          <button
            onClick={nav(() => setView('my-leads'))}
            className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition flex items-center justify-between gap-2 ${view === 'my-leads' ? 'bg-emerald-900/50 text-emerald-400' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <span className="flex items-center gap-2">
              <span>📌</span> Dodeljeni leadovi
            </span>
            <span className="flex items-center gap-1.5">
              {newCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                  {newCount > 99 ? '99+' : newCount} novo
                </span>
              )}
              <span className="text-xs text-gray-500">{totalAssigned}</span>
            </span>
          </button>

          <button
            onClick={nav(() => setView('calendar'))}
            className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${view === 'calendar' ? 'bg-blue-900/50 text-blue-400' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <span>📅</span> Kalendar
          </button>

          <button
            onClick={nav(() => setView('customers'))}
            className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${view === 'customers' ? 'bg-violet-900/50 text-violet-400' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <span>🛍️</span> Kupci
          </button>

          <div className="pt-3 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Kategorije
          </div>

          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={nav(() => setCategory(key))}
              className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition flex items-center justify-between ${
                view === 'leads' && filters.category === key ? 'bg-gray-700 text-gray-100' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>
                <span className="mr-2">{cfg.icon}</span>
                {cfg.label}
              </span>
              <span className="text-xs text-gray-500">{byCategory[key] || 0}</span>
            </button>
          ))}

          <button
            onClick={nav(() => { setCategory(''); setView('leads') })}
            className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition ${
              view === 'leads' && !filters.category ? 'bg-gray-700 text-gray-100' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Svi Leadovi
            <span className="text-xs text-gray-500 ml-2">{total}</span>
          </button>

          {/* Status summary */}
          <div className="pt-4 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status pregled
          </div>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between px-3 py-1 text-xs text-gray-400">
              <span>{label}</span>
              <span className="font-medium">{byStatus[key] || 0}</span>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-2">Ukupno leadova: {total}</div>
          {user && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onChangePassword && onChangePassword()}
                className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-100 font-medium truncate"
                title="Klikni za promenu sifre"
              >
                <span className="truncate">{user.displayName || user.username}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/50 text-emerald-300 flex-shrink-0">
                    admin
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="text-xs text-red-400 hover:text-red-300 transition flex-shrink-0"
              >
                Odjavi se
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
