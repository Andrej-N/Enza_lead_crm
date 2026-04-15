import { useState } from 'react'
import Dashboard from './Dashboard'
import DailyActivityView from './DailyActivityView'
import AdminUsersTab from './AdminUsersTab'
import AdminAssignmentTab from './AdminAssignmentTab'
import AdminPerformanceTab from './AdminPerformanceTab'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'daily-activity', label: 'Dnevna aktivnost', icon: '📅' },
  { key: 'users', label: 'Korisnici', icon: '👥' },
  { key: 'assignment', label: 'Dodela leadova', icon: '📋' },
  { key: 'performance', label: 'Performanse', icon: '📈' },
]

export default function AdminPanel({ stats, setCategory, leads, onSelectLead, resetFiltersAndFetch }) {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Admin Panel</h1>
        <p className="text-xs text-gray-500 mt-1">Upravljanje sistemom, korisnicima i dodelom leadova</p>
      </div>

      {/* Tab strip */}
      <div className="mb-6 border-b border-gray-700">
        <div className="flex flex-wrap gap-1 -mb-px">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                tab === t.key
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'dashboard' && (
          <div className="-mx-6 -mt-6">
            <Dashboard stats={stats} setCategory={setCategory} leads={leads} fetchLeads={resetFiltersAndFetch} />
          </div>
        )}
        {tab === 'daily-activity' && (
          <div className="-mx-6 -mt-6">
            <DailyActivityView onSelectLead={onSelectLead} />
          </div>
        )}
        {tab === 'users' && <AdminUsersTab />}
        {tab === 'assignment' && <AdminAssignmentTab />}
        {tab === 'performance' && <AdminPerformanceTab />}
      </div>
    </div>
  )
}
