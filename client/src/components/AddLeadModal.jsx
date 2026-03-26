import { useState } from 'react'

export default function AddLeadModal({ onClose, onCreate, category }) {
  const [form, setForm] = useState({
    category: category || 'hotel',
    subcategory: '',
    name: '',
    city: '',
    address: '',
    website: '',
    phone1: '',
    phone2: '',
    email: '',
    email2: '',
    contact_person: '',
    stars: '',
    num_rooms: '',
    clinic_type: '',
    has_stationary: 0,
    has_surgery: 0,
    has_maternity: 0,
    has_palliative: 0,
    num_beds: '',
    project_name: '',
    area_sqm: '',
    num_apartments: '',
    construction_phase: '',
    investor_size: 'mali',
    notes: '',
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return alert('Naziv je obavezan')
    onCreate(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-800">Dodaj novi lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kategorija *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="hotel">Hotel</option>
              <option value="klinika">Privatna klinika</option>
              <option value="investitor">Investitor</option>
              <option value="prodavac">Prodavac namestaja</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Naziv *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ime hotela / klinike / firme" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Grad</label>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Adresa</label>
              <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Telefon</label>
              <input type="text" value={form.phone1} onChange={e => set('phone1', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
              <input type="text" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kontakt osoba</label>
            <input type="text" value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Website</label>
            <input type="text" value={form.website} onChange={e => set('website', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          {/* Hotel specific */}
          {form.category === 'hotel' && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-700">Hotel detalji</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Podkategorija</label>
                  <select value={form.subcategory} onChange={e => set('subcategory', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm">
                    <option value="">Izaberi</option>
                    <option value="Luksuzni 5*">Luksuzni 5*</option>
                    <option value="Luksuzni 4-5*">Luksuzni 4-5*</option>
                    <option value="Premium 4*">Premium 4*</option>
                    <option value="Srednji 3-4*">Srednji 3-4*</option>
                    <option value="U Izgradnji">U Izgradnji</option>
                    <option value="Apartmani">Apartmani</option>
                    <option value="Hosteli">Hosteli</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Zvezdice</label>
                  <input type="text" value={form.stars} onChange={e => set('stars', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm" placeholder="5*" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Br. soba</label>
                  <input type="text" value={form.num_rooms} onChange={e => set('num_rooms', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Klinika specific */}
          {form.category === 'klinika' && (
            <div className="bg-rose-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-rose-700">Klinika detalji</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tip ustanove</label>
                  <input type="text" value={form.clinic_type} onChange={e => set('clinic_type', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Br. kreveta</label>
                  <input type="text" value={form.num_beds} onChange={e => set('num_beds', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm" />
                </div>
              </div>
              <div className="flex gap-4">
                {[['has_stationary', 'Stacionar'], ['has_surgery', 'Hirurgija'], ['has_maternity', 'Porodiliste'], ['has_palliative', 'Palijativa']].map(([f, l]) => (
                  <label key={f} className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" checked={!!form[f]} onChange={e => set(f, e.target.checked ? 1 : 0)} className="rounded" />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Investitor specific */}
          {form.category === 'investitor' && (
            <div className="bg-orange-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-orange-700">Investitor detalji</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Projekat</label>
                  <input type="text" value={form.project_name} onChange={e => set('project_name', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Velicina</label>
                  <select value={form.investor_size} onChange={e => set('investor_size', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm">
                    <option value="mali">Mali (&lt;2000 m2)</option>
                    <option value="srednji">Srednji (2000-5000 m2)</option>
                    <option value="veliki">Veliki (5000+ m2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Povrsina (m2)</label>
                  <input type="text" value={form.area_sqm} onChange={e => set('area_sqm', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Faza gradnje</label>
                  <input type="text" value={form.construction_phase} onChange={e => set('construction_phase', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Beleske</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-medium text-sm">
              Sacuvaj lead
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm">
              Otkazi
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
