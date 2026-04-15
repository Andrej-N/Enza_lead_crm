import { useState } from 'react'

export default function ChangePasswordModal({ onClose, mode = 'self', targetUserId = null, targetUsername = null }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const isSelf = mode === 'self'

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Nova sifra mora imati najmanje 8 karaktera')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Sifre se ne poklapaju')
      return
    }

    setLoading(true)
    try {
      let res
      if (isSelf) {
        res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        })
      } else {
        res = await fetch(`/api/users/${targetUserId}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ new_password: newPassword })
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Greska pri promeni sifre')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => { onClose && onClose() }, 1500)
    } catch (err) {
      setError('Greska u konekciji sa serverom')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-100">
            {isSelf ? 'Promena sifre' : `Reset sifre${targetUsername ? ` — ${targetUsername}` : ''}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {isSelf && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Trenutna sifra
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Nova sifra
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              autoFocus={!isSelf}
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Najmanje 8 karaktera</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Potvrdi novu sifru
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-xs text-red-300 font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-900/50 border border-emerald-700 rounded-lg text-xs text-emerald-300 font-medium">
              Sifra je uspesno promenjena
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
              disabled={loading || success}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Cuvanje...' : 'Sacuvaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
