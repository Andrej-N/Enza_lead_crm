import AnalyticsDashboard from './AnalyticsDashboard'
import { generateWeeklyReport } from '../utils/generatePDF'

const STATUS_LABELS = {
  not_contacted: 'Nije kontaktiran',
  called: 'Pozvan',
  meeting_scheduled: 'Zakazan sastanak',
  negotiation: 'Pregovori',
  deal_closed: 'Dogovoren posao',
  not_interested: 'Nije zainteresovan',
}

export default function Dashboard({ stats, setCategory }) {
  const categories = [
    { key: 'hotel', label: 'Hoteli', icon: '🏨', desc: 'Aktivni hoteli, u izgradnji, apartmani', color: 'from-blue-500 to-blue-600' },
    { key: 'klinika', label: 'Privatne Klinike', icon: '🏥', desc: 'Klinike sa stacionarom', color: 'from-rose-500 to-rose-600' },
    { key: 'investitor', label: 'Investitori', icon: '🏗️', desc: 'Mali, srednji i veliki investitori', color: 'from-orange-500 to-orange-600' },
    { key: 'prodavac', label: 'Prodavci Namestaja', icon: '🛋️', desc: 'Prodavci namestaja i rasvete', color: 'from-violet-500 to-violet-600' },
  ]

  const contacted = (stats.byStatus.called || 0) + (stats.byStatus.meeting_scheduled || 0) +
    (stats.byStatus.negotiation || 0) + (stats.byStatus.deal_closed || 0)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">Enza Home - Lead Dashboard</h1>
        <p className="text-gray-400 mt-1">Pracenje potencijalnih klijenata za Enza Home namestaj</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
          <div className="text-3xl font-bold text-gray-100">{stats.total}</div>
          <div className="text-sm text-gray-400 mt-1">Ukupno leadova</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
          <div className="text-3xl font-bold text-emerald-400">{contacted}</div>
          <div className="text-sm text-gray-400 mt-1">Kontaktirano</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
          <div className="text-3xl font-bold text-blue-400">{stats.byStatus.meeting_scheduled || 0}</div>
          <div className="text-sm text-gray-400 mt-1">Zakazani sastanci</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
          <div className="text-3xl font-bold text-green-400">{stats.byStatus.deal_closed || 0}</div>
          <div className="text-sm text-gray-400 mt-1">Dogovoreni poslovi</div>
        </div>
      </div>

      {/* Category cards */}
      <h2 className="text-lg font-semibold text-gray-200 mb-4">Kategorije</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm hover:shadow-md hover:border-gray-600 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl mb-2">{cat.icon}</div>
                <div className="text-lg font-semibold text-gray-100 group-hover:text-emerald-400 transition">{cat.label}</div>
                <div className="text-xs text-gray-400 mt-1">{cat.desc}</div>
              </div>
              <div className="text-3xl font-bold text-gray-600 group-hover:text-emerald-400 transition">
                {stats.byCategory[cat.key] || 0}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Analytics charts */}
      <h2 className="text-lg font-semibold text-gray-200 mb-4">Analitika</h2>
      <AnalyticsDashboard stats={stats} onExportPDF={generateWeeklyReport} />

      {/* Status breakdown */}
      <h2 className="text-lg font-semibold text-gray-200 mb-4 mt-8">Status pregled</h2>
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5">
        <div className="space-y-3">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = stats.byStatus[key] || 0
            const pct = stats.total > 0 ? (count / stats.total * 100) : 0
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-36 text-sm text-gray-300">{label}</div>
                <div className="flex-1 bg-gray-700 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      key === 'deal_closed' ? 'bg-green-500'
                      : key === 'meeting_scheduled' ? 'bg-blue-500'
                      : key === 'called' ? 'bg-yellow-500'
                      : key === 'negotiation' ? 'bg-purple-500'
                      : key === 'not_interested' ? 'bg-red-400'
                      : 'bg-gray-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-200">
                    {count}
                  </span>
                </div>
                <div className="w-12 text-right text-xs text-gray-500">{pct.toFixed(0)}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nase usluge za Enza Home */}
      <h2 className="text-lg font-semibold text-gray-200 mb-4 mt-8">Nase usluge za Enza Home</h2>
      <p className="text-sm text-gray-400 mb-4">Growth partner paket - mesecni retainer</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          {
            title: 'Lead Research & Baza podataka',
            desc: 'Istrazivanje i kvalifikacija potencijalnih klijenata po 4 kategorije. Verifikacija kontakt podataka (email, telefon). Kategorizacija po relevantnosti.',
            freq: 'Nedeljno azuriranje',
            icon: '🔍'
          },
          {
            title: 'Outreach & Zakazivanje sastanaka',
            desc: 'Hladni pozivi i prvi kontakt sa potencijalnim klijentima. Predstavljanje Enza Home ponude. Zakazivanje sastanaka za Enza prodajni tim.',
            freq: 'Svakodnevno',
            icon: '📞'
          },
          {
            title: 'Email kampanje',
            desc: 'Kreiranje email ponuda prilagodjenih po kategorijama (hoteli, klinike, investitori, prodavci). Automatizovano slanje. Follow-up sekvence za nezainteresovane.',
            freq: 'Jednom nedeljno',
            icon: '📧'
          },
          {
            title: 'CRM & Pipeline upravljanje',
            desc: 'Pracenje statusa svakog leada kroz pipeline. Azuriranje kontakt informacija. Belezenje rezultata poziva i sastanaka.',
            freq: 'Kontinuirano',
            icon: '📊'
          },
          {
            title: 'Nedeljni izvestaji',
            desc: 'Pregled novih leadova, kontaktiranih, zakazanih sastanaka i zatvorenih poslova. Analiza konverzije. Preporuke za sledeci period.',
            freq: 'Jednom nedeljno',
            icon: '📋'
          },
          {
            title: 'Partnerski konsalting',
            desc: 'Preporuke za ciljanje novih segmenata trzista. Feedback sa terena - sta klijenti traze. Pomoc pri formiranju B2B ponuda.',
            freq: 'Po potrebi',
            icon: '🤝'
          },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="font-semibold text-gray-100 text-sm">{s.title}</div>
                <div className="text-xs text-gray-400 mt-1 leading-relaxed">{s.desc}</div>
                <div className="mt-2 inline-block px-2 py-0.5 bg-emerald-900/50 text-emerald-400 text-xs rounded-full font-medium">{s.freq}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nedeljni ciklus rada */}
      <h2 className="text-lg font-semibold text-gray-200 mb-4 mt-8">Nedeljni ciklus rada</h2>
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5">
        <div className="grid grid-cols-5 gap-3">
          {[
            { day: 'Ponedeljak', tasks: ['Pregled pipeline-a', 'Planiranje poziva za nedelju', 'Novi leadovi - research'] },
            { day: 'Utorak - Sreda', tasks: ['Outreach pozivi', 'Follow-up emailovi', 'Azuriranje statusa u CRM'] },
            { day: 'Cetvrtak', tasks: ['Email kampanja - slanje', 'Zakazivanje sastanaka', 'Verifikacija kontakata'] },
            { day: 'Petak', tasks: ['Poslednji pozivi', 'Priprema nedeljnog izvestaja', 'Analiza rezultata'] },
            { day: 'Nedeljni izvestaj', tasks: ['Novi leadovi', 'Kontaktirani', 'Zakazani sastanci', 'Konverzija %'] },
          ].map((d, i) => (
            <div key={i} className={`text-center ${i === 4 ? 'bg-emerald-900/30 rounded-lg p-3' : 'p-3'}`}>
              <div className="text-xs font-semibold text-gray-200 mb-2">{d.day}</div>
              {d.tasks.map((t, j) => (
                <div key={j} className="text-xs text-gray-400 py-0.5">{t}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
