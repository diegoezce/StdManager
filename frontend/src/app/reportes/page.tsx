'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { MondlyEntry } from '@/types'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// ── Shared helpers ────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'A1 – Beginner',
  elementary: 'A2 – Elementary',
  'pre-intermediate': 'B1 – Pre-Intermediate',
  intermediate: 'B1+ – Intermediate',
  'upper-intermediate': 'B2 – Upper Intermediate',
  advanced: 'C1 – Advanced',
}

const LEVEL_LABEL_SHORT: Record<string, string> = {
  beginner: 'A1',
  elementary: 'A2',
  'pre-intermediate': 'B1',
  intermediate: 'B1+',
  'upper-intermediate': 'B2',
  advanced: 'C1',
}

const LEVEL_ORDER = ['beginner', 'elementary', 'pre-intermediate', 'intermediate', 'upper-intermediate', 'advanced']

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'bg-gray-100 text-gray-700',
  elementary: 'bg-blue-100 text-blue-700',
  'pre-intermediate': 'bg-yellow-100 text-yellow-700',
  intermediate: 'bg-amber-100 text-amber-700',
  'upper-intermediate': 'bg-orange-100 text-orange-700',
  advanced: 'bg-green-100 text-green-700',
}

const LEVEL_BAR_COLOR: Record<string, string> = {
  beginner: 'bg-gray-400',
  elementary: 'bg-blue-400',
  'pre-intermediate': 'bg-yellow-400',
  intermediate: 'bg-amber-400',
  'upper-intermediate': 'bg-orange-400',
  advanced: 'bg-green-500',
}

function AttendanceBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-400 text-sm">—</span>
  const color = rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700 w-10 text-right">{rate}%</span>
    </div>
  )
}

function FilterPills<T extends string>({
  label, options, value, onChange,
}: { label: string; options: T[]; value: T | 'all'; onChange: (v: T | 'all') => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-600 shrink-0">{label}:</span>
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => onChange('all')} className={`px-3 py-1 rounded-full text-sm font-medium transition ${value === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${value === o ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{o}</button>
        ))}
      </div>
    </div>
  )
}

// ── Student profile drawer ────────────────────────────────────────────────────

function MondlyBadge({ entries }: { entries: MondlyEntry[] }) {
  const primary = entries.find((e) => e.language === 'English') ?? entries[0]
  if (!primary) return null
  const hours = Math.round(primary.learning_minutes / 60)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
        Mondly Lv.{primary.level}
      </span>
      <span className="text-xs text-gray-500">{primary.points} pts · {hours}h · {primary.best_streak}🔥</span>
    </div>
  )
}

function StudentDrawer({ student, onClose, mondlyData }: { student: StudentRow | null; onClose: () => void; mondlyData: Record<string, MondlyEntry[]> }) {
  const isOpen = !!student

  // close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {student && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{student.full_name}</h2>
                <p className="text-sm text-gray-400 truncate">{student.email}</p>
              </div>
              <button onClick={onClose} className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Status + Level */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${student.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${student.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {student.is_active ? 'Active' : 'Inactive'}
                </span>
                {student.english_level && (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${LEVEL_COLOR[student.english_level] ?? 'bg-gray-100 text-gray-700'}`}>
                    {LEVEL_LABEL[student.english_level] ?? student.english_level}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                {student.company && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Company</p>
                    <p className="text-sm text-gray-800">{student.company}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Active groups</p>
                  {student.current_groups.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {student.current_groups.map((g) => (
                        <span key={g} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">{g}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Not enrolled in any group</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Attendance</p>
                  {student.attendance_rate !== null ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${student.attendance_rate >= 80 ? 'bg-green-500' : student.attendance_rate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(student.attendance_rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 w-16 text-right">{student.attendance_rate}%</span>
                      </div>
                      <p className="text-sm text-gray-500">{student.total_sessions} class{student.total_sessions !== 1 ? 'es' : ''} recorded</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No attendance records</p>
                  )}
                </div>

                {/* Mondly */}
                {(() => {
                  const entries = mondlyData[student.email?.toLowerCase() ?? ''] ?? []
                  if (entries.length === 0) return null
                  return (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Mondly performance</p>
                      <div className="space-y-3">
                        {entries.map((e) => (
                          <div key={e.language} className="border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">{e.language}</span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Level {e.level}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                              <span>Points: <strong>{e.points}</strong></span>
                              <span>Streak: <strong>{e.best_streak} days</strong></span>
                              <span>Time: <strong>{Math.round(e.learning_minutes / 60)}h {e.learning_minutes % 60}m</strong></span>
                              <span>Lessons: <strong>{e.lessons_completed}</strong></span>
                              <span>Words: <strong>{e.words_learned}</strong></span>
                              <span>Phrases: <strong>{e.phrases_learned}</strong></span>
                            </div>
                            {e.last_active_on && (
                              <p className="text-xs text-gray-400 mt-2">Last active: {new Date(e.last_active_on).toLocaleDateString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

type StudentRow = {
  id: string; full_name: string; email: string; company: string | null; company_id: string | null
  english_level: string; is_active: boolean; attendance_rate: number | null
  total_sessions: number; current_groups: string[]
}

type AttendanceRow = {
  student_id: string; student_name: string; company: string | null; groups: string[]
  present: number; absent: number; late: number; excused: number; total: number; rate: number | null
}

type GroupRow = {
  id: string; name: string; level: string
  teacher__user__first_name: string; teacher__user__last_name: string
  status: string; student_count: number; max_students: number
}

type Period = 'month' | 'semester' | 'year'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Last month' },
  { value: 'semester', label: 'Last 6 months' },
  { value: 'year', label: 'Last year' },
]

// ── Students report ──────────────────────────────────────────────────────────

function StudentsReport() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [sortKey, setSortKey] = useState<'full_name' | 'company' | 'english_level' | 'attendance_rate'>('full_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [drawerStudent, setDrawerStudent] = useState<StudentRow | null>(null)
  const [mondlyData, setMondlyData] = useState<Record<string, MondlyEntry[]>>({})

  useEffect(() => {
    Promise.all([
      apiClient.getStudentsReport(),
      apiClient.getMondlyData().catch(() => ({})),
    ]).then(([students, mondly]) => {
      setStudents(students)
      setMondlyData(mondly)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  const companies = useMemo(() =>
    Array.from(new Set(students.map((s) => s.company).filter(Boolean))).sort() as string[]
  , [students])

  const allGroups = useMemo(() =>
    Array.from(new Set(students.flatMap((s) => s.current_groups))).sort()
  , [students])

  const filtered = useMemo(() => {
    let rows = students
    if (!showInactive) rows = rows.filter((s) => s.is_active)
    if (selectedCompany !== 'all') rows = rows.filter((s) => s.company === selectedCompany)
    if (selectedGroup !== 'all') rows = rows.filter((s) => s.current_groups.includes(selectedGroup))
    return [...rows].sort((a, b) => {
      let va: any = a[sortKey] ?? ''
      let vb: any = b[sortKey] ?? ''
      if (sortKey === 'attendance_rate') { va = va ?? -1; vb = vb ?? -1 }
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
    })
  }, [students, selectedCompany, selectedGroup, showInactive, sortKey, sortDir])

  const stats = useMemo(() => {
    const scope = filtered.filter((s) => s.is_active || showInactive)
    const active = scope.filter((s) => s.is_active)
    const withRate = active.filter((s) => s.attendance_rate !== null)
    const avgRate = withRate.length ? Math.round(withRate.reduce((sum, s) => sum + (s.attendance_rate ?? 0), 0) / withRate.length) : null
    return {
      total: active.length,
      companies: new Set(active.map((s) => s.company).filter(Boolean)).size,
      avgRate,
      withGroup: active.filter((s) => s.current_groups.length > 0).length,
    }
  }, [filtered, showInactive])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? <span className="ml-1 text-indigo-600">{sortDir === 'asc' ? '↑' : '↓'}</span> : <span className="ml-1 text-gray-300">↕</span>

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col gap-3 print:hidden">
        {companies.length > 0 && <FilterPills label="Company" options={companies} value={selectedCompany} onChange={setSelectedCompany} />}
        {allGroups.length > 0 && <FilterPills label="Group" options={allGroups} value={selectedGroup} onChange={setSelectedGroup} />}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show inactive
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active students', value: stats.total },
          { label: 'Companies', value: stats.companies },
          { label: 'Avg. attendance', value: stats.avgRate !== null ? `${stats.avgRate}%` : '—' },
          { label: 'In active group', value: stats.withGroup },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {([['full_name', 'Student'], ['company', 'Company'], ['english_level', 'Level']] as const).map(([k, label]) => (
                  <th key={k} onClick={() => toggleSort(k)} className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                    {label} <SortIcon k={k} />
                  </th>
                ))}
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                <th onClick={() => toggleSort('attendance_rate')} className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Attendance <SortIcon k="attendance_rate" />
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No students to display</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} onClick={() => setDrawerStudent(s)} className={`hover:bg-indigo-50/40 cursor-pointer transition ${!s.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <p className="font-medium text-gray-900 text-sm">{s.full_name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                    {mondlyData[s.email?.toLowerCase() ?? ''] && (
                      <div className="mt-1"><MondlyBadge entries={mondlyData[s.email?.toLowerCase() ?? ''] ?? []} /></div>
                    )}
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">{s.company ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[s.english_level] ?? 'bg-gray-100 text-gray-700'}`}>
                      {LEVEL_LABEL_SHORT[s.english_level] ?? s.english_level}
                    </span>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">
                    {s.current_groups.length > 0 ? s.current_groups.join(', ') : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <AttendanceBar rate={s.attendance_rate} />
                    {s.total_sessions > 0 && <p className="text-xs text-gray-400 mt-0.5">{s.total_sessions} classes</p>}
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50 text-xs text-gray-400">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      <StudentDrawer student={drawerStudent} onClose={() => setDrawerStudent(null)} mondlyData={mondlyData} />
    </>
  )
}

// ── Attendance report ─────────────────────────────────────────────────────────

function AttendanceReport() {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'student_name' | 'company' | 'rate' | 'total'>('student_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setIsLoading(true)
    setSelectedGroup('all')
    apiClient.getAttendanceReport(period).then((data) => {
      setRows(data)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [period])

  const companies = useMemo(() =>
    Array.from(new Set(rows.map((r) => r.company).filter(Boolean))).sort() as string[]
  , [rows])

  const allGroups = useMemo(() =>
    Array.from(new Set(rows.flatMap((r) => r.groups))).sort()
  , [rows])

  const filtered = useMemo(() => {
    let data = rows
    if (selectedCompany !== 'all') data = data.filter((r) => r.company === selectedCompany)
    if (selectedGroup !== 'all') data = data.filter((r) => r.groups.includes(selectedGroup))
    return [...data].sort((a, b) => {
      let va: any = a[sortKey] ?? ''
      let vb: any = b[sortKey] ?? ''
      if (sortKey === 'rate' || sortKey === 'total') { va = va ?? -1; vb = vb ?? -1 }
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
    })
  }, [rows, selectedCompany, selectedGroup, sortKey, sortDir])

  const stats = useMemo(() => {
    const withRate = filtered.filter((r) => r.rate !== null)
    const avgRate = withRate.length ? Math.round(withRate.reduce((s, r) => s + (r.rate ?? 0), 0) / withRate.length) : null
    return {
      students: filtered.length,
      avgRate,
      total: filtered.reduce((s, r) => s + r.total, 0),
      absent: filtered.reduce((s, r) => s + r.absent, 0),
    }
  }, [filtered])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? <span className="ml-1 text-indigo-600">{sortDir === 'asc' ? '↑' : '↓'}</span> : <span className="ml-1 text-gray-300">↕</span>
  const Pill = ({ count, color }: { count: number; color: string }) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{count}</span>
  )

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 shrink-0">Period:</span>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${period === p.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {companies.length > 0 && <FilterPills label="Company" options={companies} value={selectedCompany} onChange={setSelectedCompany} />}
        {allGroups.length > 0 && <FilterPills label="Group" options={allGroups} value={selectedGroup} onChange={setSelectedGroup} />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Students', value: stats.students },
              { label: 'Avg. attendance', value: stats.avgRate !== null ? `${stats.avgRate}%` : '—' },
              { label: 'Classes recorded', value: stats.total },
              { label: 'Absences', value: stats.absent },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th onClick={() => toggleSort('student_name')} className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">Student <SortIcon k="student_name" /></th>
                    <th onClick={() => toggleSort('company')} className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">Company <SortIcon k="company" /></th>
                    <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                    <th onClick={() => toggleSort('total')} className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">Classes <SortIcon k="total" /></th>
                    <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                    <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Absent</th>
                    <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Late</th>
                    <th onClick={() => toggleSort('rate')} className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">Rate <SortIcon k="rate" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">No attendance records for this period</td></tr>
                  ) : filtered.map((r) => (
                    <tr key={r.student_id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-medium text-gray-900">{r.student_name}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">{r.company ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">{r.groups.join(', ') || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm text-gray-700">{r.total}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-center"><Pill count={r.present} color="bg-green-100 text-green-700" /></td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-center"><Pill count={r.absent} color="bg-red-100 text-red-700" /></td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-center"><Pill count={r.late} color="bg-yellow-100 text-yellow-700" /></td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4"><AttendanceBar rate={r.rate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-50 bg-gray-50 text-xs text-gray-400">
              {filtered.length} student{filtered.length !== 1 ? 's' : ''} — {PERIODS.find((p) => p.value === period)?.label}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Groups report ─────────────────────────────────────────────────────────────

function GroupsReport() {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    apiClient.getReports('groups').then((data) => {
      setGroups(data)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  const levels = useMemo(() =>
    LEVEL_ORDER.filter((l) => groups.some((g) => g.level === l))
  , [groups])

  const filtered = useMemo(() => {
    let data = groups
    if (selectedLevel !== 'all') data = data.filter((g) => g.level === selectedLevel)
    if (selectedStatus !== 'all') data = data.filter((g) => g.status === selectedStatus)
    return data
  }, [groups, selectedLevel, selectedStatus])

  const stats = useMemo(() => {
    const active = groups.filter((g) => g.status === 'active')
    const totalCapacity = active.reduce((s, g) => s + g.max_students, 0)
    const totalEnrolled = active.reduce((s, g) => s + g.student_count, 0)
    return {
      total: groups.length,
      active: active.length,
      totalCapacity,
      totalEnrolled,
      occupancy: totalCapacity > 0 ? Math.round(totalEnrolled / totalCapacity * 100) : 0,
    }
  }, [groups])

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col gap-3 print:hidden">
        {levels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600 shrink-0">Level:</span>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setSelectedLevel('all')} className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedLevel === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
              {levels.map((l) => (
                <button key={l} onClick={() => setSelectedLevel(l)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedLevel === l ? 'bg-indigo-600 text-white' : `${LEVEL_COLOR[l]} hover:opacity-80`}`}>
                  {LEVEL_LABEL_SHORT[l]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 shrink-0">Status:</span>
          <div className="flex gap-1">
            {(['all', 'active', 'planning', 'completed'] as const).map((s) => (
              <button key={s} onClick={() => setSelectedStatus(s)} className={`px-3 py-1 rounded-full text-sm font-medium transition capitalize ${selectedStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total groups', value: stats.total },
          { label: 'Active groups', value: stats.active },
          { label: 'Total enrolled', value: `${stats.totalEnrolled} / ${stats.totalCapacity}` },
          { label: 'Occupancy', value: `${stats.occupancy}%` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Enrolled</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No groups to display</td></tr>
              ) : filtered.map((g) => {
                const pct = g.max_students > 0 ? Math.round(g.student_count / g.max_students * 100) : 0
                const barColor = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-green-400'
                return (
                  <tr key={g.id} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-medium text-gray-900">{g.name}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[g.level] ?? 'bg-gray-100 text-gray-700'}`}>
                        {LEVEL_LABEL_SHORT[g.level] ?? g.level}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">
                      {[g.teacher__user__first_name, g.teacher__user__last_name].filter(Boolean).join(' ') || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div className={`${barColor} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-sm text-gray-700">{g.student_count}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-600">{g.max_students}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {g.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50 text-xs text-gray-400">
          {filtered.length} group{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
    </>
  )
}

// ── Levels report ─────────────────────────────────────────────────────────────

function LevelsReport() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [drawerStudent, setDrawerStudent] = useState<StudentRow | null>(null)
  const [mondlyData, setMondlyData] = useState<Record<string, MondlyEntry[]>>({})

  useEffect(() => {
    Promise.all([
      apiClient.getStudentsReport(),
      apiClient.getMondlyData().catch(() => ({})),
    ]).then(([data, mondly]) => {
      setStudents(data.filter((s: StudentRow) => s.is_active))
      setMondlyData(mondly)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  const companies = useMemo(() =>
    Array.from(new Set(students.map((s) => s.company).filter(Boolean))).sort() as string[]
  , [students])

  const scope = useMemo(() =>
    selectedCompany === 'all' ? students : students.filter((s) => s.company === selectedCompany)
  , [students, selectedCompany])

  const byLevel = useMemo(() => {
    return LEVEL_ORDER.map((level) => {
      const group = scope.filter((s) => s.english_level === level)
      const withRate = group.filter((s) => s.attendance_rate !== null)
      const avgRate = withRate.length ? Math.round(withRate.reduce((sum, s) => sum + (s.attendance_rate ?? 0), 0) / withRate.length) : null
      return { level, count: group.length, avgRate, students: group }
    }).filter((r) => r.count > 0)
  }, [scope])

  const total = scope.length

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>

  return (
    <>
      {companies.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 print:hidden">
          <FilterPills label="Company" options={companies} value={selectedCompany} onChange={setSelectedCompany} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active students', value: total },
          { label: 'Levels in use', value: byLevel.length },
          { label: 'Most common level', value: byLevel.length > 0 ? (LEVEL_LABEL_SHORT[byLevel.sort((a, b) => b.count - a.count)[0].level] ?? '—') : '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Level breakdown bars */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Distribution by level</h3>
        <div className="space-y-4">
          {[...byLevel].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)).map((row) => {
            const pct = total > 0 ? Math.round(row.count / total * 100) : 0
            return (
              <div key={row.level}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[row.level]}`}>
                      {LEVEL_LABEL_SHORT[row.level]}
                    </span>
                    <span className="text-sm text-gray-700">{LEVEL_LABEL[row.level]}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{row.count} student{row.count !== 1 ? 's' : ''} <span className="text-gray-400">({pct}%)</span></span>
                    {row.avgRate !== null && (
                      <span className="text-xs text-gray-400">avg attendance {row.avgRate}%</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={`${LEVEL_BAR_COLOR[row.level]} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail table */}
      <div className="space-y-4">
        {[...byLevel].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)).map((row) => (
          <details key={row.level} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <summary className="px-3 py-3 sm:px-6 sm:py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition list-none">
              <div className="flex items-center gap-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[row.level]}`}>
                  {LEVEL_LABEL_SHORT[row.level]}
                </span>
                <span className="font-medium text-gray-800">{LEVEL_LABEL[row.level]}</span>
                <span className="text-sm text-gray-400">{row.count} student{row.count !== 1 ? 's' : ''}</span>
              </div>
              {row.avgRate !== null && <AttendanceBar rate={row.avgRate} />}
            </summary>
            <div className="border-t border-gray-100">
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-50">
                  {row.students.sort((a, b) => a.full_name.localeCompare(b.full_name)).map((s) => (
                    <tr key={s.id} onClick={() => setDrawerStudent(s)} className="hover:bg-indigo-50/40 cursor-pointer transition">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{s.full_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{s.company ?? '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{s.current_groups.join(', ') || '—'}</td>
                      <td className="px-6 py-3"><AttendanceBar rate={s.attendance_rate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>

      <StudentDrawer student={drawerStudent} onClose={() => setDrawerStudent(null)} mondlyData={mondlyData} />
    </>
  )
}

// ── Teachers report ───────────────────────────────────────────────────────────

type TeacherDay = {
  date: string; group_id: string; group_name: string; students: string[]
}

type TeacherRow = {
  teacher_id: string; full_name: string; email: string
  hours: number; groups_count: number; year: number; month: number
  days: TeacherDay[]
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function TeacherDetailModal({ teacher, onClose }: { teacher: TeacherRow | null; onClose: () => void }) {
  const isOpen = !!teacher

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {teacher && (
          <>
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{teacher.full_name}</h2>
                <p className="text-sm text-gray-400 truncate">{teacher.email}</p>
              </div>
              <button onClick={onClose} className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary */}
            <div className="px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex gap-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Period</p>
                <p className="text-sm font-semibold text-gray-800">{MONTH_NAMES[teacher.month - 1]} {teacher.year}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Hours</p>
                <p className="text-2xl font-bold text-indigo-700">{teacher.hours}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Groups</p>
                <p className="text-sm font-semibold text-gray-800">{teacher.groups_count}</p>
              </div>
            </div>

            {/* Day list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {teacher.days.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No classes recorded</p>
              ) : (
                <div className="space-y-3">
                  {teacher.days.map((day, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-800">
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{day.group_name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{day.students.length} student{day.students.length !== 1 ? 's' : ''}</span>
                      </div>
                      {day.students.length > 0 && (
                        <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                          {day.students.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function TeachersReport() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rows, setRows] = useState<TeacherRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null)

  useEffect(() => {
    setIsLoading(true)
    apiClient.getTeachersReport(year, month).then((data) => {
      setRows(data)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [year, month])

  const totalHours = rows.reduce((s, r) => s + r.hours, 0)

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
    if (isCurrentMonth) return
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  return (
    <>
      {/* Month navigator */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-4 print:hidden">
        <button onClick={prevMonth} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-[160px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Teachers', value: rows.length },
          { label: 'Total hours', value: totalHours },
          { label: 'Avg. hours / teacher', value: rows.length > 0 ? Math.round(totalHours / rows.length) : '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
          No attendance records for {MONTH_NAMES[month - 1]} {year}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Groups</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <tr key={r.teacher_id} onClick={() => setSelectedTeacher(r)} className="hover:bg-indigo-50/40 cursor-pointer transition">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-gray-900">{r.full_name}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-500">{r.email}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm text-gray-700">{r.groups_count}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">{r.hours}h</span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-500">{MONTH_NAMES[r.month - 1]} {r.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-gray-50 bg-gray-50 text-xs text-gray-400">
            {rows.length} teacher{rows.length !== 1 ? 's' : ''} · {totalHours} total hours · {MONTH_NAMES[month - 1]} {year}
          </div>
        </div>
      )}

      <TeacherDetailModal teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
    </>
  )
}

// ── Mondly report ─────────────────────────────────────────────────────────────

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

type MondlyRow = { email: string; name: string; entries: MondlyEntry[] }
type MondlySortKey = 'name' | 'level' | 'points' | 'best_streak' | 'learning_minutes' | 'lessons_completed' | 'words_learned' | 'last_active_on'

const primary = (entries: MondlyEntry[]) =>
  entries.find((e) => e.language === 'English' || e.language === 'American English') ?? entries[0]

const DAYS_INACTIVE = 30

function MondlyTable({ rows, isCorporate }: { rows: MondlyRow[]; isCorporate: boolean }) {
  const [sortKey, setSortKey] = useState<MondlySortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')

  const toggleSort = (k: MondlySortKey) => {
    if (sortKey === k) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }
  const SortIcon = ({ k }: { k: MondlySortKey }) =>
    sortKey === k
      ? <span className="ml-1 text-purple-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span className="ml-1 text-gray-300">↕</span>

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    let filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.includes(q)) : rows
    return [...filtered].sort((a, b) => {
      const pa = primary(a.entries)
      const pb = primary(b.entries)
      let va: any, vb: any
      if (sortKey === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase() }
      else if (sortKey === 'last_active_on') { va = pa?.last_active_on ?? ''; vb = pb?.last_active_on ?? '' }
      else { va = (pa as any)?.[sortKey] ?? 0; vb = (pb as any)?.[sortKey] ?? 0 }
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
    })
  }, [rows, sortKey, sortDir, search])

  const Th = ({ k, label, center }: { k: MondlySortKey; label: string; center?: boolean }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none ${center ? 'text-center' : 'text-left'}`}
    >
      {label}<SortIcon k={k} />
    </th>
  )

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <Th k="name" label="Student" />
                <Th k="level" label="Level" center />
                <Th k="points" label="Points" center />
                <Th k="best_streak" label="Streak" center />
                <Th k="learning_minutes" label="Time" center />
                <Th k="lessons_completed" label="Lessons" center />
                <Th k="words_learned" label="Words" center />
                <Th k="last_active_on" label="Last active" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((r) => {
                const p = primary(r.entries)
                if (!p) return null
                const hours = Math.floor(p.learning_minutes / 60)
                const mins = p.learning_minutes % 60
                const inactive = !p.last_active_on || (Date.now() - new Date(p.last_active_on).getTime()) > DAYS_INACTIVE * 86400000
                return (
                  <tr key={r.email} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.name || r.email}</p>
                          {!isCorporate && <p className="text-xs text-gray-400">{r.email}</p>}
                        </div>
                        {inactive && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium shrink-0">Inactive</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">{p.level}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{p.points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{p.best_streak}d</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{hours}h{mins > 0 ? ` ${mins}m` : ''}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{p.lessons_completed}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{p.words_learned}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.last_active_on ? new Date(p.last_active_on).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50 text-xs text-gray-400">
          {sorted.length} student{sorted.length !== 1 ? 's' : ''}
        </div>
      </div>
    </>
  )
}

function MondlyCorporateDashboard({ rows }: { rows: MondlyRow[] }) {
  const now = Date.now()

  const stats = useMemo(() => {
    const withPrimary = rows.map((r) => ({ r, p: primary(r.entries) })).filter((x) => x.p)
    const totalMinutes = withPrimary.reduce((s, { p }) => s + (p!.learning_minutes), 0)
    const avgLevel = withPrimary.length ? withPrimary.reduce((s, { p }) => s + p!.level, 0) / withPrimary.length : 0
    const active = withPrimary.filter(({ p }) => p!.last_active_on && (now - new Date(p!.last_active_on).getTime()) < DAYS_INACTIVE * 86400000)
    const topPoints = [...withPrimary].sort((a, b) => b.p!.points - a.p!.points).slice(0, 5)
    const topTime = [...withPrimary].sort((a, b) => b.p!.learning_minutes - a.p!.learning_minutes).slice(0, 5)

    // Level distribution
    const levelDist: Record<number, number> = {}
    withPrimary.forEach(({ p }) => { levelDist[p!.level] = (levelDist[p!.level] ?? 0) + 1 })
    const levelData = Array.from({ length: 9 }, (_, i) => ({ level: `Lv.${i + 1}`, count: levelDist[i + 1] ?? 0 })).filter((d) => d.count > 0)

    return {
      total: rows.length,
      totalHours: Math.round(totalMinutes / 60),
      avgLevel: avgLevel.toFixed(1),
      activeCount: active.length,
      inactiveCount: withPrimary.length - active.length,
      topPoints,
      topTime,
      levelData,
    }
  }, [rows])

  const PURPLE = '#7c3aed'
  const GRAY = '#e5e7eb'
  const donutData = [
    { name: `Active (last ${DAYS_INACTIVE}d)`, value: stats.activeCount },
    { name: 'Inactive', value: stats.inactiveCount },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Team members', value: stats.total },
          { label: 'Total hours', value: `${stats.totalHours}h` },
          { label: 'Avg. level', value: stats.avgLevel },
          { label: `Active last ${DAYS_INACTIVE}d`, value: `${stats.activeCount} / ${stats.total}` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Level distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Level distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.levelData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="level" tick={{ fontSize: 12 }} width={36} />
              <Tooltip formatter={(v) => [`${v} students`, '']} />
              <Bar dataKey="count" fill={PURPLE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement donut */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Engagement</h3>
          {stats.activeCount + stats.inactiveCount > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                  <Cell fill={PURPLE} />
                  <Cell fill={GRAY} />
                </Pie>
                <Legend formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Tooltip formatter={(v, n) => [`${v} students`, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          )}
        </div>
      </div>

      {/* Top performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Top 5 by points', data: stats.topPoints, getValue: (p: MondlyEntry) => `${p.points.toLocaleString()} pts` },
          { title: 'Top 5 by time', data: stats.topTime, getValue: (p: MondlyEntry) => `${Math.round(p.learning_minutes / 60)}h ${p.learning_minutes % 60}m` },
        ].map(({ title, data, getValue }) => (
          <div key={title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
            <ol className="space-y-2">
              {data.map(({ r, p }, i) => (
                <li key={r.email} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{r.name || r.email}</span>
                  <span className="text-sm font-semibold text-purple-700 shrink-0">{getValue(p!)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}

function MondlyReport() {
  const { user } = useAuth()
  const isCorporate = user?.role === 'corporate_client'
  const showDashboard = isCorporate || user?.role === 'owner' || user?.role === 'manager'
  const canImport = user?.role && ['owner', 'manager', 'admin'].includes(user.role)

  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; matched: number; unmatched: number; skipped: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [rows, setRows] = useState<MondlyRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = () => {
    apiClient.getMondlyData().then((data) => {
      const list: MondlyRow[] = Object.entries(data).map(([email, entries]) => ({
        email,
        name: entries[0]?.name ?? email,
        entries,
      })).sort((a, b) => a.name.localeCompare(b.name))
      setRows(list)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError('')
    setImportResult(null)
    try {
      const result = await apiClient.mondlyImport(file)
      setImportResult(result)
      load()
    } catch (err: any) {
      setImportError(err?.response?.data?.error ?? 'Import failed')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      {canImport && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Import Mondly report</h3>
              <p className="text-xs text-gray-400 mt-0.5">Upload the Excel or CSV export from Mondly. Parsed in memory — file not stored.</p>
            </div>
            <label className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition ${importing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              {importing ? 'Importing...' : 'Upload file'}
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} disabled={importing} />
            </label>
          </div>
          {importResult && (
            <div className="mt-4 flex flex-wrap gap-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <span className="text-green-700 font-medium">Import complete</span>
              <span className="text-gray-600">{importResult.imported} records imported</span>
              <span className="text-green-600">{importResult.matched} matched to students</span>
              {importResult.unmatched > 0 && <span className="text-amber-600">{importResult.unmatched} unmatched</span>}
            </div>
          )}
          {importError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{importError}</div>}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 text-sm">
          {isCorporate ? 'No Mondly data available for your team yet.' : 'No Mondly data yet. Upload a report to get started.'}
        </div>
      ) : (
        <>
          {showDashboard && <MondlyCorporateDashboard rows={rows} />}
          <div className={showDashboard ? 'mt-6' : ''}>
            {showDashboard && <h3 className="text-sm font-semibold text-gray-700 mb-3">Full team breakdown</h3>}
            <MondlyTable rows={rows} isCorporate={isCorporate} />
          </div>
        </>
      )}
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'students' | 'attendance' | 'groups' | 'levels' | 'teachers' | 'mondly'

const TABS: { value: Tab; label: string; teacherHidden?: boolean; ownerOnly?: boolean }[] = [
  { value: 'students', label: 'Students', teacherHidden: true },
  { value: 'attendance', label: 'Attendance' },
  { value: 'groups', label: 'Groups', teacherHidden: true },
  { value: 'levels', label: 'Levels', teacherHidden: true },
  { value: 'teachers', label: 'Teachers', teacherHidden: true, ownerOnly: true },
  { value: 'mondly', label: 'Mondly', teacherHidden: true },
]

export default function ReportesPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager'
  const [activeTab, setActiveTab] = useState<Tab>(isTeacher ? 'attendance' : 'students')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) await me()
      } catch {
        router.push('/login')
      }
    }
    checkAuth()
  }, [user, me, router])

  const isCorporateClient = user?.role === 'corporate_client'
  const visibleTabs = TABS.filter((t) => {
    if (isTeacher && t.teacherHidden) return false
    if (isCorporateClient && t.teacherHidden) return false
    if (t.ownerOnly && !isOwnerOrManager) return false
    return true
  })
  const today = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'corporate_client', 'teacher']}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Analítica"
            title="Reportes"
            subtitle={`Generado el ${today}.`}
            actions={
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition print:hidden"
              >
                Imprimir / Exportar PDF
              </button>
            }
          />

          <div className="flex gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-fit print:hidden">
            {visibleTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'students' && <StudentsReport />}
          {activeTab === 'attendance' && <AttendanceReport />}
          {activeTab === 'groups' && <GroupsReport />}
          {activeTab === 'levels' && <LevelsReport />}
          {activeTab === 'teachers' && <TeachersReport />}
          {activeTab === 'mondly' && <MondlyReport />}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body { background: white; }
          .max-w-7xl { max-width: 100%; padding: 0 16px; }
        }
      `}</style>
    </ProtectedRoute>
  )
}
