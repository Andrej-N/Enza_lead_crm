import { useState, useEffect } from 'react'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  purchase_date: '',
  products: '',
  purchase_value: '',
  notes: '',
  marketing_consent: 0,
}

export default function CustomerModal({ customer, onClose, onSave, onDelete }) {
  const isEdit = !!(customer && customer.id)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isEdit) {
      setForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        city: customer.city || '',
        address: customer.address || '',
        purchase_date: customer.purchase_date || '',
        products: customer.products || '',
        purchase_value: customer.purchase_value || '',
        notes: customer.notes || '',
        marketing_consent: customer.marketing_consent || 0,
      })
    } else {
      // New customer: default purchase_date to today
      const today = new Date().toISOString().slice(0, 10)
      setForm({ ...emptyForm, purchase_date: today })
    }
  }, [customer])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return alert('Ime kupca je obavezno')
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 shadow-2xl w-full md:w-[620px] max-h-[95vh] md:max-h-[90vh] overflow-y-auto border border-gray-700 rounded-t-2xl md:rounded-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 md:px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl md:rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-gray-100">
              {isEdit ? 'Uredi kupca' : 'Dodaj kupca'}
            </h2>
            {isEdit && customer.created_by_name && (
              <p className="text-xs text-gray-500 mt-0.5">
                Uneo: {customer.created_by_name || customer.created_by_username}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-3xl leading-none p-2 -mr-2"
            aria-label="Zatvori"
          >
            &times;
          </button>
        </div>

        <form onSubmit={submit} className="px-4 md:px-6 py-4 space-y-5">
          {/* Basic info */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Osnovni podaci</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Ime i prezime *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="npr. Marko Markovic"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Telefon</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="+381 ..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="kupac@email.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Grad</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Beograd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Adresa</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Purchase */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kupovina</div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Datum kupovine</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={e => set('purchase_date', e.target.value)}
                    className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Iznos</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.purchase_value}
                    onChange={e => set('purchase_value', e.target.value)}
                    className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="npr. 250.000 RSD"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Sta je kupljeno</label>
                <textarea
                  value={form.products}
                  onChange={e => set('products', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="npr. 3-sed garnitura, 2 fotelje, sto za kafu"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Napomene</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-3 md:py-2 bg-gray-700 border border-gray-600 rounded-lg text-base md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Dodatne napomene o kupcu"
            />
          </div>

          {/* Marketing consent — prominent */}
          <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.marketing_consent}
                onChange={e => set('marketing_consent', e.target.checked ? 1 : 0)}
                className="mt-0.5 w-5 h-5 md:w-4 md:h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-200">
                  Kupac je pristao da prima promotivne email-ove
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Potrebno za buduce email kampanje. Bez eksplicitne saglasnosti kupac ne ulazi u mailing listu.
                </div>
                {isEdit && customer.consent_date && !!form.marketing_consent && (
                  <div className="text-xs text-emerald-400 mt-1">
                    ✓ Saglasnost data: {customer.consent_date}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Footer buttons — sticky on mobile */}
          <div className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:mb-0 px-4 md:px-0 py-3 md:py-0 bg-gray-800 md:bg-transparent border-t md:border-t border-gray-700 md:pt-4 flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3">
            {isEdit ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Sigurno?</span>
                  <button
                    type="button"
                    onClick={() => onDelete && onDelete(customer.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition"
                  >
                    Da, obrisi
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-600 transition"
                  >
                    Ne
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2 text-xs text-red-400 hover:text-red-300 transition self-start md:self-auto"
                >
                  Obrisi kupca
                </button>
              )
            ) : <span className="hidden md:inline" />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 md:py-2 text-sm text-gray-400 hover:text-gray-200 transition"
              >
                Otkazi
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="flex-1 md:flex-none px-4 py-2.5 md:py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Cuvam...' : (isEdit ? 'Sacuvaj' : 'Dodaj kupca')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
