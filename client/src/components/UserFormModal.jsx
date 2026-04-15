import { useState } from 'react'

export default function UserFormModal({ mode = 'create', user = null, onClose, onSaved }) {
  const isEdit = mode === 'edit'
  const [username, setUsername] = useState(user?.username || '')
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [role, setRole] = useState(user?.role || 'user')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isEdit) {
      if (!username.trim()) { setError('Username je obavezan'); return }
      if (password.length < 8) { setError('Sifra mora imati najmanje 8 karaktera'); return }
    }
    if (!displayName.trim()) { setError('Ime je obavezno'); return }

    setLoading(true)
    try {
      let res
      if (isEdit) {
        res = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ display_name: displayName, role })
        })
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: username.trim(), password, display_name: displayName.trim(), role })
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Greska pri cuvanju korisnika')
        setLoading(false)
        return
      }

      onSaved && onSaved()
      onClose && onClose()
    } catch (err) {
      setError('Greska u konekciji sa serverom')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-100">
            {isEdit ? 'Izmeni korisnika' : 'Novi korisnik'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={isEdit}
              autoCapitalize="none"
              autoComplete="off"
              className="w-full px-3 py-2.5 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              required
              autoFocus={!isEdit}
            />
            {isEdit && <p className="text-xs text-gray-500 mt-1">Username se ne moze menjati</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Ime i prezime
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              autoFocus={isEdit}
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Sifra
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">Najmanje 8 karaktera</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Uloga
            </label>
            <div className="flex gap-2">
              <label className={`flex-1 px-3 py-2.5 border rounded-lg text-sm cursor-pointer transition ${
                role === 'user'
                  ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
                <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} className="sr-only" />
                <span className="font-medium">User</span>
                <div className="text-xs text-gray-500 mt-0.5">Samo dodeljeni leadovi</div>
              </label>
              <label className={`flex-1 px-3 py-2.5 border rounded-lg text-sm cursor-pointer transition ${
                role === 'admin'
                  ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
                <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} className="sr-only" />
                <span className="font-medium">Admin</span>
                <div className="text-xs text-gray-500 mt-0.5">Puni pristup</div>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-xs text-red-300 font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition"
            >
              Otkazi
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Cuvanje...' : (isEdit ? 'Sacuvaj' : 'Kreiraj')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
