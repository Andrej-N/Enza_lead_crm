const STATUS_CONFIG = {
  not_contacted: { label: 'Nije kontaktiran', bg: 'bg-gray-100 text-gray-600' },
  called: { label: 'Pozvan', bg: 'bg-yellow-100 text-yellow-800' },
  meeting_scheduled: { label: 'Zakazan sastanak', bg: 'bg-blue-100 text-blue-800' },
  negotiation: { label: 'Pregovori', bg: 'bg-purple-100 text-purple-800' },
  deal_closed: { label: 'Dogovoren posao', bg: 'bg-green-100 text-green-800' },
  not_interested: { label: 'Nije zainteresovan', bg: 'bg-red-100 text-red-700' },
}

export default function LeadTable({ leads, loading, category, onSelect, onUpdateStatus }) {
  if (loading) {
    return <div className="text-center py-12 text-gray-400">Ucitavanje...</div>
  }

  if (!leads.length) {
    return <div className="text-center py-12 text-gray-400">Nema rezultata</div>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Naziv</th>
              {category === 'hotel' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Zvezdice</th>}
              {category === 'hotel' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Sobe</th>}
              {category === 'investitor' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Projekat</th>}
              {category === 'investitor' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Velicina</th>}
              {category === 'investitor' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Faza</th>}
              {category === 'klinika' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Tip</th>}
              {category === 'klinika' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Kreveti</th>}
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Grad</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Telefon</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map(lead => {
              const status = STATUS_CONFIG[lead.outreach_status] || STATUS_CONFIG.not_contacted
              return (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => onSelect(lead)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{lead.name}</div>
                    <div className="text-xs text-gray-400">{lead.subcategory}</div>
                  </td>
                  {category === 'hotel' && <td className="px-4 py-3 text-gray-600">{lead.stars || '-'}</td>}
                  {category === 'hotel' && <td className="px-4 py-3 text-gray-600">{lead.num_rooms || '-'}</td>}
                  {category === 'investitor' && <td className="px-4 py-3 text-gray-600 max-w-48 truncate">{lead.project_name || '-'}</td>}
                  {category === 'investitor' && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        lead.investor_size === 'veliki' ? 'bg-orange-100 text-orange-700'
                        : lead.investor_size === 'srednji' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.investor_size === 'veliki' ? 'Veliki' : lead.investor_size === 'srednji' ? 'Srednji' : 'Mali'}
                      </span>
                    </td>
                  )}
                  {category === 'investitor' && <td className="px-4 py-3 text-xs text-gray-500 max-w-32 truncate">{lead.construction_phase || '-'}</td>}
                  {category === 'klinika' && <td className="px-4 py-3 text-xs text-gray-600">{lead.clinic_type || '-'}</td>}
                  {category === 'klinika' && <td className="px-4 py-3 text-gray-600">{lead.num_beds || '-'}</td>}
                  <td className="px-4 py-3 text-gray-600">{lead.city || '-'}</td>
                  <td className="px-4 py-3">
                    {lead.phone1 ? (
                      <a href={`tel:${lead.phone1}`} className="text-blue-600 hover:underline text-xs" onClick={e => e.stopPropagation()}>
                        {lead.phone1.split('\n')[0]}
                      </a>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline text-xs" onClick={e => e.stopPropagation()}>
                        {lead.email.split('\n')[0].substring(0, 25)}{lead.email.length > 25 ? '...' : ''}
                      </a>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.outreach_status}
                      onChange={e => { e.stopPropagation(); onUpdateStatus(lead.id, e.target.value) }}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${status.bg}`}
                      onClick={e => e.stopPropagation()}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400">→</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
