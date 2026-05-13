'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// ── Shared ──────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'A1',
  elementary: 'A2',
  'pre-intermediate': 'B1',
  intermediate: 'B1+',
  'upper-intermediate': 'B2',
  advanced: 'C1',
}

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'bg-gray-100 text-gray-700',
  elementary: 'bg-blue-100 text-blue-700',
  'pre-intermediate': 'bg-yellow-100 text-yellow-700',
  intermediate: 'bg-amber-100 text-amber-700',
  'upper-intermediate': 'bg-orange-100 text-orange-700',
  advanced: 'bg-green-100 text-green-700',
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

// ── Types ────────────────────────────────────────────────────────────────────

type StudentRow = {
  id: string
  full_name: string
  email: string
  company: string | null
  company_id: string | null
  english_level: string
  is_active: boolean
  attendance_rate: number | null
  total_sessions: number
  current_groups: string[]
}

type AttendanceRow = {
  student_id: string
  student_name: string
  company: string | null
  groups: string[]
  present: number
  absent: number
  late: number
  excused: number
  total: number
  rate: number | null
}

type Period = 'month' | 'semester' | 'year'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Last month' },
  { value: 'semester', label: 'Last 6 months' },
  { value: 'year', label: 'Last year' },
]

// ── Students sub-report ──────────────────────────────────────────────────────

function StudentsReport() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [sortKey, setSortKey] = useState<'full_name' | 'company' | 'english_level' | 'attendance_rate'>('full_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    apiClient.getStudentsReport().then((data) => {
      setStudents(data)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  const companies = useMemo(() => {
    const names = Array.from(new Set(students.map((s) => s.company).filter(Boolean))) as string[]
    return names.sort()
  }, [students])

  const filtered = useMemo(() => {
    let rows = students
    if (selectedCompany !== 'all') rows = rows.filter((s) => s.company === selectedCompany)
    if (!showInactive) rows = rows.filter((s) => s.is_active)
    return [...rows].sort((a, b) => {
      let va: any = a[sortKey] ?? ''
      let vb: any = b[sortKey] ?? ''
      if (sortKey === 'attendance_rate') { va = va ?? -1; vb = vb ?? -1 }
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [students, selectedCompany, showInactive, sortKey, sortDir])

  const stats = useMemo(() => {
    const scope = selectedCompany === 'all' ? students : students.filter((s) => s.company === selectedCompany)
    const active = scope.filter((s) => s.is_active)
    const withRate = active.filter((s) => s.attendance_rate !== null)
    const avgRate = withRate.length
      ? Math.round(withRate.reduce((sum, s) => sum + (s.attendance_rate ?? 0), 0) / withRate.length)
      : null
    return {
      total: active.length,
      companies: new Set(active.map((s) => s.company).filter(Boolean)).size,
      avgRate,
      withGroup: active.filter((s) => s.current_groups.length > 0).length,
    }
  }, [students, selectedCompany])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k
      ? <span className="ml-1 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span className="ml-1 text-gray-300">↕</span>

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Company:</span>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setSelectedCompany('all')} className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedCompany === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
            {companies.map((c) => (
              <button key={c} onClick={() => setSelectedCompany(c)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedCompany === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{c}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show inactive
        </label>
      </div>

      {/* KPI Cards */}
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {selectedCompany !== 'all' && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-sm font-semibold text-blue-800">{selectedCompany}</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {([['full_name', 'Student'], ['company', 'Company'], ['english_level', 'Level']] as const).map(([k, label]) => (
                  <th key={k} onClick={() => toggleSort(k)} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                    {label} <SortIcon k={k} />
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Current group</th>
                <th onClick={() => toggleSort('attendance_rate')} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Attendance <SortIcon k="attendance_rate" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No students to display</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 text-sm">{s.full_name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.company ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[s.english_level] ?? 'bg-gray-100 text-gray-700'}`}>
                      {LEVEL_LABEL[s.english_level] ?? s.english_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {s.current_groups.length > 0 ? s.current_groups.join(', ') : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <AttendanceBar rate={s.attendance_rate} />
                    {s.total_sessions > 0 && <p className="text-xs text-gray-400 mt-0.5">{s.total_sessions} classes</p>}
                  </td>
                  <td className="px-6 py-4">
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
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}{selectedCompany !== 'all' ? ` from ${selectedCompany}` : ' total'}
        </div>
      </div>
    </>
  )
}

// ── Attendance sub-report ────────────────────────────────────────────────────

function AttendanceReport() {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'student_name' | 'company' | 'rate' | 'total'>('student_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setIsLoading(true)
    apiClient.getAttendanceReport(period).then((data) => {
      setRows(data)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [period])

  const companies = useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.company).filter(Boolean))) as string[]
    return names.sort()
  }, [rows])

  const filtered = useMemo(() => {
    let data = rows
    if (selectedCompany !== 'all') data = data.filter((r) => r.company === selectedCompany)
    return [...data].sort((a, b) => {
      let va: any = a[sortKey] ?? ''
      let vb: any = b[sortKey] ?? ''
      if (sortKey === 'rate' || sortKey === 'total') { va = va ?? -1; vb = vb ?? -1 }
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, selectedCompany, sortKey, sortDir])

  const stats = useMemo(() => {
    const scope = selectedCompany === 'all' ? rows : rows.filter((r) => r.company === selectedCompany)
    const withRate = scope.filter((r) => r.rate !== null)
    const avgRate = withRate.length
      ? Math.round(withRate.reduce((s, r) => s + (r.rate ?? 0), 0) / withRate.length)
      : null
    const total = scope.reduce((s, r) => s + r.total, 0)
    const present = scope.reduce((s, r) => s + r.present, 0)
    const absent = scope.reduce((s, r) => s + r.absent, 0)
    return { students: scope.length, avgRate, total, present, absent }
  }, [rows, selectedCompany])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k
      ? <span className="ml-1 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span className="ml-1 text-gray-300">↕</span>

  const StatusPill = ({ count, color }: { count: number; color: string }) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{count}</span>
  )

  return (
    <>
      {/* Period + Company filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Period:</span>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${period === p.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {companies.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Company:</span>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setSelectedCompany('all')} className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedCompany === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
              {companies.map((c) => (
                <button key={c} onClick={() => setSelectedCompany(c)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedCompany === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{c}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <>
          {/* KPI Cards */}
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

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th onClick={() => toggleSort('student_name')} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                      Student <SortIcon k="student_name" />
                    </th>
                    <th onClick={() => toggleSort('company')} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                      Company <SortIcon k="company" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                    <th onClick={() => toggleSort('total')} className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                      Classes <SortIcon k="total" />
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Absent</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Late</th>
                    <th onClick={() => toggleSort('rate')} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                      Rate <SortIcon k="rate" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">No attendance records for this period</td></tr>
                  ) : filtered.map((r) => (
                    <tr key={r.student_id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.student_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.company ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.groups.join(', ') || <span className="text-gray-300">—</span>}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">{r.total}</td>
                      <td className="px-6 py-4 text-center"><StatusPill count={r.present} color="bg-green-100 text-green-700" /></td>
                      <td className="px-6 py-4 text-center"><StatusPill count={r.absent} color="bg-red-100 text-red-700" /></td>
                      <td className="px-6 py-4 text-center"><StatusPill count={r.late} color="bg-yellow-100 text-yellow-700" /></td>
                      <td className="px-6 py-4"><AttendanceBar rate={r.rate} /></td>
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

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'students' | 'attendance'

export default function ReportesPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('students')

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

  const today = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'corporate_client']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 print:mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-500 mt-1">Generated on {today}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="self-start sm:self-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition print:hidden"
            >
              Print / Export PDF
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-fit print:hidden">
            {([['students', 'Students'], ['attendance', 'Attendance']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'students' ? <StudentsReport /> : <AttendanceReport />}
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
