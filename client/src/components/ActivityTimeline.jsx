import { useState, useEffect } from 'react'

const ACTION_ICONS = {
  status_change: '🔄',
  call_logged: '📞',
  meeting_scheduled: '📅',
  note: '📝',
  system: '⚙️',
}

const ACTION_COLORS = {
  status_change: 'border-purple-600/50 bg-purple-900/30',
  call_logged: 'border-yellow-600/50 bg-yellow-900/30',
  meeting_scheduled: 'border-blue-600/50 bg-blue-900/30',
  note: 'border-emerald-600/50 bg-emerald-900/30',
  system: 'border-gray-600 bg-gray-700/50',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr + 'Z')
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'upravo sada'
  if (diff < 3600) return `pre ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `pre ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'pre 1 dan'
  if (days < 7) return `pre ${days} dana`
  if (days < 30) return `pre ${Math.floor(days / 7)} ned.`
  return date.toLocaleDateString('sr-Latn-RS')
}

export default function ActivityTimeline({ leadId }) {
  const [activities, setActivities] = useState([])
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchActivities = async () => {
    try {
      const res = await fetch(`/api/activity/${leadId}`, { credentials: 'include' })
      const data = await res.json()
      setActivities(data)
    } catch (err) {
      console.error('Failed to fetch activities:', err)
    }
  }

  useEffect(() => { fetchActivities() }, [leadId])

  const deleteActivity = async (activityId) => {
    try {
      const res = await fetch(`/api/activity/${activityId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        fetchActivities()
      }
    } catch (err) {
      console.error('Failed to delete activity:', err)
    }
    setDeletingId(null)
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setLoading(true)
    try {
      await fetch(`/api/activity/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: noteType === 'call' ? 'Poziv' : noteType === 'meeting' ? 'Sastanak' : 'Beleska',
          details: newNote.trim(),
          action_type: noteType
        })
      })
      setNewNote('')
      fetchActivities()
    } catch (err) {
      console.error('Failed to add note:', err)
    }
    setLoading(false)
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Istorija aktivnosti</h3>

      {/* Add note form */}
      <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 mb-4">
        <div className="flex gap-2 mb-2">
          {[
            ['note', '📝 Beleska'],
            ['call', '📞 Poziv'],
            ['meeting', '📅 Sastanak'],
          ].map(([type, label]) => (
            <button
              key={type}
              onClick={() => setNoteType(type)}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                noteType === type ? 'bg-emerald-900/50 text-emerald-400 ring-1 ring-emerald-600' : 'bg-gray-600 text-gray-400 hover:bg-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Dodaj belešku, zapisi rezultat poziva..."
          className="w-full px-3 py-2 border border-gray-600 rounded text-sm bg-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={addNote}
            disabled={loading || !newNote.trim()}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Cuvam...' : 'Dodaj'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-4">Nema aktivnosti za ovaj lead</div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-600" />
          <div className="space-y-3">
            {activities.map((a, i) => {
              const type = a.action_type || 'system'
              return (
                <div key={a.id || i} className="relative pl-10">
                  <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-gray-800 border-2 border-gray-500 z-10" />
                  <div className={`rounded-lg border p-3 ${ACTION_COLORS[type] || ACTION_COLORS.system} group`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-200">
                        {ACTION_ICONS[type] || '⚙️'} {a.action}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{timeAgo(a.created_at)}</span>
                        {deletingId === a.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteActivity(a.id)}
                              className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                            >
                              Da
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded text-xs hover:bg-gray-500 transition"
                            >
                              Ne
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(a.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs transition"
                            title="Obrisi belešku"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {a.details && (
                      <div className="text-xs text-gray-300 leading-relaxed">{a.details}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
