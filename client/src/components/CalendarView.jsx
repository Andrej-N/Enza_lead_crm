import { useState, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns'
import { sr } from 'date-fns/locale'

const CATEGORY_COLORS = {
  hotel: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
  klinika: { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50' },
  investitor: { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50' },
  prodavac: { bg: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50' },
}

const CATEGORY_LABELS = {
  hotel: 'Hotel',
  klinika: 'Klinika',
  investitor: 'Investitor',
  prodavac: 'Prodavac',
}

export default function CalendarView({ onSelectLead }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [meetings, setMeetings] = useState([])
  const [followups, setFollowups] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  const fetchMeetings = async () => {
    try {
      const month = format(currentMonth, 'yyyy-MM')
      const res = await fetch(`/api/calendar/meetings?month=${month}`, { credentials: 'include' })
      setMeetings(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchFollowups = async () => {
    try {
      const res = await fetch('/api/calendar/followups', { credentials: 'include' })
      setFollowups(await res.json())
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchMeetings() }, [currentMonth])
  useEffect(() => { fetchFollowups() }, [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = []
  let day = calStart
  while (day <= calEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const getEventsForDay = (d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return meetings.filter(m => {
      if (m._type === 'call') return m.call_date && m.call_date.startsWith(dateStr)
      return m.meeting_date && m.meeting_date.startsWith(dateStr)
    })
  }

  const selectedDayMeetings = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kalendar sastanaka</h1>
          <p className="text-sm text-gray-500 mt-1">Pregled svih zakazanih sastanaka</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-800 capitalize">
                {format(currentMonth, 'LLLL yyyy', { locale: sr })}
              </h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'].map(d => (
                <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                const dayMeetings = getEventsForDay(d)
                const isSelected = selectedDay && isSameDay(d, selectedDay)
                const inMonth = isSameMonth(d, currentMonth)
                const today = isToday(d)

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(d)}
                    className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 cursor-pointer transition hover:bg-gray-50 ${
                      isSelected ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-300' : ''
                    } ${!inMonth ? 'opacity-30' : ''}`}
                  >
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      today ? 'bg-emerald-600 text-white' : 'text-gray-600'
                    }`}>
                      {format(d, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayMeetings.slice(0, 3).map((m, j) => {
                        const isCall = m._type === 'call'
                        const colors = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.hotel
                        return (
                          <div key={j} className={`${isCall ? 'bg-yellow-400' : colors.bg} text-white text-[10px] px-1 py-0.5 rounded truncate leading-tight`}>
                            {isCall ? '📞 ' : ''}{m.name}
                          </div>
                        )
                      })}
                      {dayMeetings.length > 3 && (
                        <div className="text-[10px] text-gray-400 pl-1">+{dayMeetings.length - 3} jos</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day detail */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {selectedDay ? format(selectedDay, 'd. MMMM yyyy', { locale: sr }) : 'Izaberite dan'}
            </h3>
            {selectedDay && selectedDayMeetings.length === 0 && (
              <p className="text-xs text-gray-400">Nema zakazanih dogadjaja</p>
            )}
            <div className="space-y-2">
              {selectedDayMeetings.map((m, i) => {
                const isCall = m._type === 'call'
                const colors = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.hotel
                return (
                  <div
                    key={i}
                    className={`${isCall ? 'bg-yellow-50 border border-yellow-200' : colors.light} rounded-lg p-3 cursor-pointer hover:shadow-sm transition`}
                    onClick={() => onSelectLead && onSelectLead(m)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        {isCall ? '📞 ' : '📅 '}{m.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isCall ? 'bg-yellow-400' : colors.bg} text-white font-medium`}>
                        {isCall ? 'Poziv' : CATEGORY_LABELS[m.category]}
                      </span>
                    </div>
                    {m.city && <div className="text-xs text-gray-500">📍 {m.city}</div>}
                    {m.phone1 && (
                      <a href={`tel:${m.phone1}`} className="text-xs text-emerald-600 hover:underline" onClick={e => e.stopPropagation()}>📞 {m.phone1}</a>
                    )}
                    {m.meeting_notes && !isCall && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{m.meeting_notes}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Follow-up tracker */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Follow-up potreban</h3>
            <p className="text-xs text-gray-400 mb-3">Pozvani leadovi bez odgovora</p>

            {followups.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Sve je u toku!</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {followups.map((f, i) => {
                  const days = f.days_since_call || 0
                  const urgency = days >= 7 ? 'bg-red-50 border-red-200' : days >= 5 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'
                  const urgencyText = days >= 7 ? 'text-red-600' : days >= 5 ? 'text-orange-600' : 'text-yellow-600'
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-2.5 cursor-pointer hover:shadow-sm transition ${urgency}`}
                      onClick={() => onSelectLead && onSelectLead(f)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-800">{f.name}</span>
                        <span className={`text-[10px] font-bold ${urgencyText}`}>{days}d</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {f.city && `📍 ${f.city}`}
                        {f.phone1 && ` · 📞 ${f.phone1}`}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Pozvan: {f.call_date}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
