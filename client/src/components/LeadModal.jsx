import { useState, useEffect } from 'react'
import ActivityTimeline from './ActivityTimeline'

const STATUS_CONFIG = {
  not_contacted: { label: 'Nije kontaktiran', bg: 'bg-gray-700 text-gray-300' },
  called: { label: 'Pozvan', bg: 'bg-yellow-900/50 text-yellow-300' },
  meeting_scheduled: { label: 'Zakazan sastanak', bg: 'bg-blue-900/50 text-blue-300' },
  negotiation: { label: 'Pregovori', bg: 'bg-purple-900/50 text-purple-300' },
  deal_closed: { label: 'Dogovoren posao', bg: 'bg-green-900/50 text-green-300' },
  not_interested: { label: 'Nije zainteresovan', bg: 'bg-red-900/50 text-red-300' },
}

function EditableField({ label, value, field, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  useEffect(() => { if (!editing) setVal(value || '') }, [value, editing])

  const save = () => {
    onSave({ [field]: val })
    setEditing(false)
  }

  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
      {editing ? (
        <div className="flex gap-2 mt-1">
          <input
            className="flex-1 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <button onClick={save} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">OK</button>
          <button onClick={() => { setVal(value || ''); setEditing(false) }} className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">X</button>
        </div>
      ) : (
        <div
          className="mt-1 text-sm text-gray-200 cursor-pointer hover:bg-gray-600 px-2 py-1 rounded border border-transparent hover:border-gray-500 transition min-h-6"
          onClick={() => setEditing(true)}
          title="Klikni za izmenu"
        >
          {value || <span className="text-gray-500 italic">Klikni za unos</span>}
        </div>
      )}
    </div>
  )
}

function EditableDateField({ label, value, field, onSave }) {
  const [val, setVal] = useState(value || '')
  useEffect(() => { setVal(value || '') }, [value])

  const handleChange = (e) => {
    const newVal = e.target.value
    setVal(newVal)
    onSave({ [field]: newVal })
  }

  const clear = () => {
    setVal('')
    onSave({ [field]: '' })
  }

  const displayDate = val ? new Date(val + 'T00:00:00').toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="date"
          className="flex-1 px-2 py-1.5 border border-gray-600 rounded text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={val}
          onChange={handleChange}
        />
        {val && (
          <>
            <span className="text-xs text-gray-400">{displayDate}</span>
            <button onClick={clear} className="text-gray-500 hover:text-red-400 text-xs" title="Obrisi datum">✕</button>
          </>
        )}
      </div>
    </div>
  )
}

function EditableTextArea({ label, value, field, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  useEffect(() => { if (!editing) setVal(value || '') }, [value, editing])

  const save = () => {
    onSave({ [field]: val })
    setEditing(false)
  }

  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
      {editing ? (
        <div className="mt-1">
          <textarea
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={val}
            onChange={e => setVal(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button onClick={save} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Sacuvaj</button>
            <button onClick={() => { setVal(value || ''); setEditing(false) }} className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">Otkazi</button>
          </div>
        </div>
      ) : (
        <div
          className="mt-1 text-sm text-gray-200 cursor-pointer hover:bg-gray-600 px-2 py-1 rounded border border-transparent hover:border-gray-500 transition whitespace-pre-wrap min-h-6"
          onClick={() => setEditing(true)}
          title="Klikni za izmenu"
        >
          {value || <span className="text-gray-500 italic">Klikni za unos</span>}
        </div>
      )}
    </div>
  )
}

export default function LeadModal({ lead, onClose, onUpdate, onDelete }) {
  const status = STATUS_CONFIG[lead.outreach_status] || STATUS_CONFIG.not_contacted

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="w-[500px] h-full bg-gray-800 shadow-2xl overflow-y-auto animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-100">{lead.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{lead.category === 'hotel' ? 'Hotel' : lead.category === 'klinika' ? 'Klinika' : lead.category === 'investitor' ? 'Investitor' : 'Prodavac'}</span>
              {lead.subcategory && <span className="text-xs text-gray-500">/ {lead.subcategory}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-2xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-4">
          {/* Status */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status Outreach</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => onUpdate({ outreach_status: k })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    lead.outreach_status === k ? v.bg + ' ring-2 ring-offset-1 ring-offset-gray-800 ring-gray-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info - editable */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Kontakt informacije</h3>
              {lead.phone_verified && lead.email_verified ? (
                <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs font-semibold rounded-full">Verifikovan</span>
              ) : null}
            </div>
            <EditableField label="Telefon 1" value={lead.phone1} field="phone1" onSave={onUpdate} />
            <EditableField label="Telefon 2" value={lead.phone2} field="phone2" onSave={onUpdate} />
            <EditableField label="Email" value={lead.email} field="email" onSave={onUpdate} />
            <EditableField label="Email 2" value={lead.email2} field="email2" onSave={onUpdate} />
            <EditableField label="Kontakt osoba" value={lead.contact_person} field="contact_person" onSave={onUpdate} />
            <EditableField label="Website" value={lead.website} field="website" onSave={onUpdate} />

            {/* Verification switches */}
            <div className="mt-4 pt-3 border-t border-gray-600">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Verifikacija kontakta</label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Telefon verifikovan</span>
                  <button
                    onClick={() => onUpdate({ phone_verified: lead.phone_verified ? 0 : 1 })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${lead.phone_verified ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${lead.phone_verified ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Email verifikovan</span>
                  <button
                    onClick={() => onUpdate({ email_verified: lead.email_verified ? 0 : 1 })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${lead.email_verified ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${lead.email_verified ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-600">
                  <span className="text-sm font-medium text-gray-200">Sve verifikovano</span>
                  <button
                    onClick={() => {
                      const newVal = (lead.phone_verified && lead.email_verified) ? 0 : 1
                      onUpdate({ phone_verified: newVal, email_verified: newVal })
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${lead.phone_verified && lead.email_verified ? 'bg-green-600' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${lead.phone_verified && lead.email_verified ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Lokacija</h3>
            <EditableField label="Grad" value={lead.city} field="city" onSave={onUpdate} />
            <EditableField label="Adresa" value={lead.address} field="address" onSave={onUpdate} />
          </div>

          {/* Category-specific info */}
          {lead.category === 'hotel' && (
            <div className="bg-blue-900/20 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-400 mb-3">Hotel detalji</h3>
              <EditableField label="Zvezdice" value={lead.stars} field="stars" onSave={onUpdate} />
              <EditableField label="Broj soba" value={lead.num_rooms} field="num_rooms" onSave={onUpdate} />
              <EditableField label="Google rejting" value={lead.google_rating} field="google_rating" onSave={onUpdate} />
              <EditableField label="Status email-a" value={lead.email_status} field="email_status" onSave={onUpdate} />
            </div>
          )}

          {lead.category === 'klinika' && (
            <div className="bg-rose-900/20 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-rose-400 mb-3">Klinika detalji</h3>
              <EditableField label="Tip ustanove" value={lead.clinic_type} field="clinic_type" onSave={onUpdate} />
              <EditableField label="Broj kreveta" value={lead.num_beds} field="num_beds" onSave={onUpdate} />
              <EditableField label="Relevantnost" value={lead.relevance} field="relevance" onSave={onUpdate} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  ['has_stationary', 'Stacionar'],
                  ['has_surgery', 'Hirurgija'],
                  ['has_maternity', 'Porodiliste'],
                  ['has_palliative', 'Palijativa'],
                ].map(([field, label]) => (
                  <div key={field} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!lead[field]}
                      onChange={e => onUpdate({ [field]: e.target.checked ? 1 : 0 })}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-300">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lead.category === 'investitor' && (
            <div className="bg-orange-900/20 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-orange-400 mb-3">Investitor detalji</h3>
              <EditableField label="Projekat" value={lead.project_name} field="project_name" onSave={onUpdate} />
              <EditableField label="Povrsina (m2)" value={lead.area_sqm} field="area_sqm" onSave={onUpdate} />
              <EditableField label="Broj stanova" value={lead.num_apartments} field="num_apartments" onSave={onUpdate} />
              <EditableField label="Faza gradnje" value={lead.construction_phase} field="construction_phase" onSave={onUpdate} />
              <EditableField label="Investicija (EUR)" value={lead.investment_eur} field="investment_eur" onSave={onUpdate} />
              <EditableField label="Datum otvaranja" value={lead.opening_date} field="opening_date" onSave={onUpdate} />
              <div className="mt-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Velicina</label>
                <select
                  value={lead.investor_size || ''}
                  onChange={e => onUpdate({ investor_size: e.target.value })}
                  className="mt-1 w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-gray-100"
                >
                  <option value="mali">Mali (&lt;2000 m2)</option>
                  <option value="srednji">Srednji (2000-5000 m2)</option>
                  <option value="veliki">Veliki (5000+ m2)</option>
                </select>
              </div>
            </div>
          )}

          {/* Meeting tracking */}
          <div className="bg-emerald-900/20 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">Pracenje kontakta</h3>
            <EditableDateField label="Datum poziva" value={lead.call_date} field="call_date" onSave={onUpdate} />
            <EditableDateField label="Datum sastanka" value={lead.meeting_date} field="meeting_date" onSave={onUpdate} />
            <EditableTextArea label="Beleske sa sastanka" value={lead.meeting_notes} field="meeting_notes" onSave={onUpdate} />
          </div>

          {/* Notes */}
          <EditableTextArea label="Opste beleske" value={lead.notes} field="notes" onSave={onUpdate} />

          {/* Activity Timeline */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <ActivityTimeline leadId={lead.id} />
          </div>

          {/* Delete */}
          <div className="mt-8 pt-4 border-t border-gray-700">
            <button
              onClick={onDelete}
              className="text-red-400 text-xs hover:text-red-300 transition"
            >
              Obrisi ovaj lead
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
