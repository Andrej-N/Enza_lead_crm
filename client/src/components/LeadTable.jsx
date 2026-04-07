const STATUS_CONFIG = {
  not_contacted: { label: 'Nije kontaktiran', bg: 'bg-gray-700 text-gray-300' },
  called: { label: 'Pozvan', bg: 'bg-yellow-900/50 text-yellow-300' },
  meeting_scheduled: { label: 'Zakazan sastanak', bg: 'bg-blue-900/50 text-blue-300' },
  negotiation: { label: 'Pregovori', bg: 'bg-purple-900/50 text-purple-300' },
  deal_closed: { label: 'Dogovoren posao', bg: 'bg-green-900/50 text-green-300' },
  not_interested: { label: 'Nije zainteresovan', bg: 'bg-red-900/50 text-red-300' },
}

export default function LeadTable({ leads, loading, category, onSelect, onUpdateStatus }) {
  if (loading) {
    return <div className="text-center py-12 text-gray-500">Ucitavanje...</div>
  }

  if (!leads.length) {
    return <div className="text-center py-12 text-gray-500">Nema rezultata</div>
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-750 border-b border-gray-700" style={{ backgroundColor: '#1e293b' }}>
              <th className="text-left px-4 py-3 font-semibold text-gray-300">Naziv</th>
              {category === 'hotel' && <th className="text-left px-4 py-3 font-semibold text-gray-300">Zvezdice</th>}
              {category === 'hotel' && <th className="text-left px-4 py-3 font-semibold text-gray-300">Sobe</th>}
              {category === 'investitor' && <th className="text-left px-4 py-3 font-semibold text-gray-300">Projekat</th>}
              {category === 'investitor' && <th className="text-left px-4 py-3 font-semibold text-gray-300">Velicina</th>}
              {category === 'investitor' && <th className="text-left px-4 py-3 font-semibold text-gray-300">Faza</th>}
              {category === 'klinika' && <th className="text-left px-4 py-3 font-semibold text-gray-300">Tip</th>}
              {category === 'klinika' && <th className="text-left px-4 py-3 font-semibold text-gray-300">Kreveti</th>}
              <th className="text-left px-4 py-3 font-semibold text-gray-300">Grad</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-300">Telefon</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-300">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-300">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-300 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {leads.map(lead => {
              const status = STATUS_CONFIG[lead.outreach_status] || STATUS_CONFIG.not_contacted
              return (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-700/50 cursor-pointer transition"
                  onClick={() => onSelect(lead)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-100 flex items-center gap-1.5">
                      {lead.name}
                      {lead.phone_verified === 1 && lead.email_verified === 1 && (
                        <span title="Verifikovan (telefon + email)" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{lead.subcategory}</div>
                  </td>
                  {category === 'hotel' && <td className="px-4 py-3 text-gray-300">{lead.stars || '-'}</td>}
                  {category === 'hotel' && <td className="px-4 py-3 text-gray-300">{lead.num_rooms || '-'}</td>}
                  {category === 'investitor' && <td className="px-4 py-3 text-gray-300 max-w-48 truncate">{lead.project_name || '-'}</td>}
                  {category === 'investitor' && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        lead.investor_size === 'veliki' ? 'bg-orange-900/50 text-orange-300'
                        : lead.investor_size === 'srednji' ? 'bg-amber-900/50 text-amber-300'
                        : 'bg-gray-700 text-gray-300'
                      }`}>
                        {lead.investor_size === 'veliki' ? 'Veliki' : lead.investor_size === 'srednji' ? 'Srednji' : 'Mali'}
                      </span>
                    </td>
                  )}
                  {category === 'investitor' && <td className="px-4 py-3 text-xs text-gray-400 max-w-32 truncate">{lead.construction_phase || '-'}</td>}
                  {category === 'klinika' && <td className="px-4 py-3 text-xs text-gray-300">{lead.clinic_type || '-'}</td>}
                  {category === 'klinika' && <td className="px-4 py-3 text-gray-300">{lead.num_beds || '-'}</td>}
                  <td className="px-4 py-3 text-gray-300">{lead.city || '-'}</td>
                  <td className="px-4 py-3">
                    {lead.phone1 ? (
                      <a href={`tel:${lead.phone1}`} className="text-blue-400 hover:underline text-xs" onClick={e => e.stopPropagation()}>
                        {lead.phone1.split('\n')[0]}
                      </a>
                    ) : <span className="text-gray-600">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline text-xs" onClick={e => e.stopPropagation()}>
                        {lead.email.split('\n')[0].substring(0, 25)}{lead.email.length > 25 ? '...' : ''}
                      </a>
                    ) : <span className="text-gray-600">-</span>}
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
                  <td className="px-4 py-3 text-gray-500">→</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
