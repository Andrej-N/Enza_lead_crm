import AnalyticsDashboard from './AnalyticsDashboard'
import { generateWeeklyReport } from '../utils/generatePDF'

export default function Dashboard({ stats, setCategory }) {
  const categories = [
    { key: 'hotel', label: 'Hoteli', icon: '🏨', desc: 'Aktivni hoteli, u izgradnji, apartmani' },
    { key: 'klinika', label: 'Privatne Klinike', icon: '🏥', desc: 'Klinike sa stacionarom' },
    { key: 'investitor', label: 'Investitori', icon: '🏗️', desc: 'Mali, srednji i veliki investitori' },
    { key: 'prodavac', label: 'Prodavci Namestaja', icon: '🛋️', desc: 'Prodavci namestaja i rasvete' },
  ]

  const contacted = (stats.byStatus.called || 0) + (stats.byStatus.meeting_scheduled || 0) +
    (stats.byStatus.negotiation || 0) + (stats.byStatus.deal_closed || 0)
  const contactRate = stats.total > 0 ? Math.round((contacted / stats.total) * 100) : 0

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Pregled stanja pipeline-a</p>
        </div>
        <button
          data-pdf-btn
          onClick={generateWeeklyReport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 border border-gray-700 transition text-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          PDF Izvestaj
        </button>
      </div>

      {/* KPI cards — hero section */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-sm text-gray-500 mb-1">Ukupno leadova</div>
          <div className="text-3xl font-bold text-gray-100">{stats.total}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-sm text-gray-500 mb-1">Kontaktirano</div>
          <div className="text-3xl font-bold text-emerald-400">{contacted}</div>
          <div className="text-xs text-gray-500 mt-1">{contactRate}% od ukupno</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-sm text-gray-500 mb-1">Zakazani sastanci</div>
          <div className="text-3xl font-bold text-blue-400">{stats.byStatus.meeting_scheduled || 0}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-sm text-gray-500 mb-1">Dogovoreni poslovi</div>
          <div className="text-3xl font-bold text-green-400">{stats.byStatus.deal_closed || 0}</div>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-500 transition text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{cat.icon}</span>
              <span className="text-2xl font-bold text-gray-600 group-hover:text-gray-300 transition">
                {stats.byCategory[cat.key] || 0}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-200">{cat.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{cat.desc}</div>
          </button>
        ))}
      </div>

      {/* Analytics — pipeline + response rate only */}
      <AnalyticsDashboard stats={stats} />

      {/* Nedeljni ciklus rada — podsetnik za tim */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Nedeljni plan rada</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="grid grid-cols-5 gap-4">
            {[
              { day: 'Ponedeljak', tasks: ['Pregled pipeline-a', 'Planiranje poziva', 'Research novih leadova'] },
              { day: 'Utorak - Sreda', tasks: ['Outreach pozivi', 'Follow-up emailovi', 'Azuriranje CRM-a'] },
              { day: 'Cetvrtak', tasks: ['Email kampanja', 'Zakazivanje sastanaka', 'Verifikacija kontakata'] },
              { day: 'Petak', tasks: ['Poslednji pozivi', 'Nedeljni izvestaj', 'Analiza rezultata'] },
              { day: 'Izvestaj', tasks: ['Novi leadovi', 'Kontaktirani', 'Sastanci', 'Konverzija %'] },
            ].map((d, i) => (
              <div key={i} className={`text-center ${i === 4 ? 'bg-emerald-900/20 rounded-lg p-3' : 'p-3'}`}>
                <div className="text-xs font-semibold text-gray-300 mb-2">{d.day}</div>
                {d.tasks.map((t, j) => (
                  <div key={j} className="text-xs text-gray-500 py-0.5">{t}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
