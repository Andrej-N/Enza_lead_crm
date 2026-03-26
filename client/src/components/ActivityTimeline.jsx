import { useState, useEffect } from 'react'

const ACTION_ICONS = {
  status_change: '🔄',
  call_logged: '📞',
  meeting_scheduled: '📅',
  note: '📝',
  system: '⚙️',
}

const ACTION_COLORS = {
  status_change: 'border-purple-300 bg-purple-50',
  call_logged: 'border-yellow-300 bg-yellow-50',
  meeting_scheduled: 'border-blue-300 bg-blue-50',
  note: 'border-emerald-300 bg-emerald-50',
  system: 'border-gray-300 bg-gray-50',
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
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Istorija aktivnosti</h3>

      {/* Add note form */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
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
                noteType === type ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
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
          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
        <div className="text-xs text-gray-400 text-center py-4">Nema aktivnosti za ovaj lead</div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-3">
            {activities.map((a, i) => {
              const type = a.action_type || 'system'
              return (
                <div key={a.id || i} className="relative pl-10">
                  <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-white border-2 border-gray-300 z-10" />
                  <div className={`rounded-lg border p-3 ${ACTION_COLORS[type] || ACTION_COLORS.system}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {ACTION_ICONS[type] || '⚙️'} {a.action}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(a.created_at)}</span>
                    </div>
                    {a.details && (
                      <div className="text-xs text-gray-600 leading-relaxed">{a.details}</div>
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
