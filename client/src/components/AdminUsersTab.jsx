import { useState, useEffect } from 'react'
import UserFormModal from './UserFormModal'
import ChangePasswordModal from './ChangePasswordModal'

export default function AdminUsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [formMode, setFormMode] = useState(null) // 'create' | 'edit' | null
  const [editingUser, setEditingUser] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      if (!res.ok) { setUsers([]); return }
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setUsers([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleActive = async (u) => {
    const newActive = u.active ? 0 : 1
    const action = u.active ? 'deaktivirati' : 'aktivirati'
    if (!confirm(`Da li zelite da ${action} korisnika ${u.display_name || u.username}?`)) return
    await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ active: newActive })
    })
    fetchUsers()
  }

  const deleteUser = async (u) => {
    if (!confirm(`Da li zelite trajno da obrisete korisnika ${u.display_name || u.username}? Njegovi leadovi ce postati neraspoređeni.`)) return
    await fetch(`/api/users/${u.id}`, { method: 'DELETE', credentials: 'include' })
    fetchUsers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Korisnici</h2>
          <p className="text-xs text-gray-500 mt-0.5">Upravljanje nalozima zaposlenih</p>
        </div>
        <button
          onClick={() => { setFormMode('create'); setEditingUser(null) }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
        >
          + Novi korisnik
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700" style={{ backgroundColor: '#1e293b' }}>
                <th className="text-left px-4 py-3 font-semibold text-gray-300">Username</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-300">Ime</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-300">Uloga</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-300">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Leadovi</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Pozivi danas</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Pozivi (7d)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Sastanci (7d)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Dogovori (7d)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-300">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">Ucitavanje...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">Nema korisnika</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-700/50 transition ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-200 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-gray-300">{u.display_name || '—'}</td>
                  <td className="px-4 py-3">
                    {u.role === 'admin' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/50 text-emerald-300">admin</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">user</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 text-green-300">Aktivan</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/40 text-red-300">Deaktiviran</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.assigned_count ?? 0}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.calls_today ?? 0}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.calls_week ?? 0}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.meetings_week ?? 0}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.deals_week ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end flex-wrap">
                      <button
                        onClick={() => { setFormMode('edit'); setEditingUser(u) }}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition"
                      >
                        Izmeni
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition"
                      >
                        Reset sifre
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`text-xs px-2 py-1 rounded transition ${
                          u.active
                            ? 'bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60'
                            : 'bg-green-900/40 text-green-300 hover:bg-green-900/60'
                        }`}
                      >
                        {u.active ? 'Deaktiviraj' : 'Aktiviraj'}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60 transition"
                      >
                        Obrisi
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {formMode && (
        <UserFormModal
          mode={formMode}
          user={editingUser}
          onClose={() => { setFormMode(null); setEditingUser(null) }}
          onSaved={fetchUsers}
        />
      )}

      {resetTarget && (
        <ChangePasswordModal
          mode="admin"
          targetUserId={resetTarget.id}
          targetUsername={resetTarget.username}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
