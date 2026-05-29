'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Group, Enrollment } from '@/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Select } from '@/components/Select'

const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function MiniCalendar({
  selectedDate,
  onSelectDate,
  daysWithAttendance,
  daysWithEmptySession,
  calendarMonth,
  onChangeMonth,
}: {
  selectedDate: string
  onSelectDate: (d: string) => void
  daysWithAttendance: Set<string>
  daysWithEmptySession: Set<string>
  calendarMonth: Date
  onChangeMonth: (d: Date) => void
}) {
  const days = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) })
  const firstDow = (getDay(days[0]) + 6) % 7
  const blanks = Array(firstDow).fill(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onChangeMonth(subMonths(calendarMonth, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-500 text-xs leading-none">‹</button>
        <span className="text-xs font-semibold text-gray-700">
          {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
        </span>
        <button onClick={() => onChangeMonth(addMonths(calendarMonth, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-500 text-xs leading-none">›</button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-center text-[10px] font-medium text-gray-400">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const ds = format(day, 'yyyy-MM-dd')
          const hasAtt = daysWithAttendance.has(ds)
          const isEmpty = daysWithEmptySession.has(ds)
          const isSelected = ds === selectedDate
          const isToday = ds === today
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className={[
                'relative mx-auto flex items-center justify-center w-7 h-7 rounded-full text-xs transition',
                isSelected
                  ? 'bg-blue-600 text-white font-bold'
                  : hasAtt
                    ? 'bg-green-100 text-green-800 font-semibold hover:bg-green-200'
                    : isEmpty
                      ? 'bg-orange-100 text-orange-800 font-semibold hover:bg-orange-200'
                      : isToday
                        ? 'border border-blue-300 text-blue-600 hover:bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
            >
              {day.getDate()}
              {hasAtt && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
              )}
              {isEmpty && !hasAtt && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Con alumnos</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Sin alumnos</span>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()))
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasExisting, setHasExisting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [daysWithAttendance, setDaysWithAttendance] = useState<Set<string>>(new Set())
  const [daysWithEmptySession, setDaysWithEmptySession] = useState<Set<string>>(new Set())
  const [emptySessionId, setEmptySessionId] = useState<string | null>(null)
  const [isTogglingEmpty, setIsTogglingEmpty] = useState(false)

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

  useEffect(() => {
    if (!user) return
    apiClient.getGroups().then((res) => {
      const data = res.results || res
      setGroups(data)
      if (data.length > 0) setSelectedGroup(data[0])
    }).catch(console.error).finally(() => setIsLoading(false))
  }, [user])

  useEffect(() => {
    if (!selectedGroup) return
    apiClient.getGroup(selectedGroup.id).then((groupData) => {
      const enrollmentsData: Enrollment[] = groupData.enrollments || []
      setEnrollments(enrollmentsData)
      const defaults: { [key: string]: string } = {}
      enrollmentsData.forEach((e) => { defaults[e.id] = 'present' })
      setAttendance(defaults)
    }).catch(console.error)
  }, [selectedGroup])

  // Load calendar dots (attendance days + empty sessions) for the month
  useEffect(() => {
    if (!selectedGroup) return
    const month = format(calendarMonth, 'yyyy-MM')
    const [y, m] = month.split('-').map(Number)

    apiClient.getAttendanceDays(selectedGroup.id, month)
      .then((res) => setDaysWithAttendance(new Set(res.dates)))
      .catch(console.error)

    // Fetch all empty sessions for this group in this month by fetching with group filter
    // We rely on the list endpoint and filter client-side by month
    apiClient.getEmptySession(selectedGroup.id, '').then((sessions) => {
      const monthStr = `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}`
      setDaysWithEmptySession(new Set(sessions.filter((s: any) => s.date?.startsWith(monthStr)).map((s: any) => s.date)))
    }).catch(console.error)
  }, [selectedGroup, calendarMonth])

  // Check for existing attendance + empty session for the selected date
  useEffect(() => {
    if (!selectedGroup || !selectedDate) {
      setHasExisting(false)
      setEmptySessionId(null)
      return
    }

    // Check empty session
    apiClient.getEmptySession(selectedGroup.id, selectedDate).then((sessions) => {
      setEmptySessionId(sessions.length > 0 ? sessions[0].id : null)
    }).catch(() => setEmptySessionId(null))

    if (enrollments.length === 0) {
      setHasExisting(false)
      return
    }

    apiClient.getAttendance(selectedGroup.id, selectedDate).then((res) => {
      const records: any[] = res.results || res
      if (records.length === 0) {
        setHasExisting(false)
        return
      }
      setHasExisting(true)
      setAttendance((prev) => {
        const updated = { ...prev }
        enrollments.forEach((enrollment) => {
          const existing = records.find((r: any) => r.student === enrollment.student)
          if (existing) updated[enrollment.id] = existing.status
        })
        return updated
      })
    }).catch(console.error)
  }, [selectedGroup, selectedDate, enrollments])

  const statusCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 }
    enrollments.forEach((e) => {
      const s = (attendance[e.id] || 'present') as keyof typeof counts
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [attendance, enrollments])

  const handleAttendanceChange = (enrollmentId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [enrollmentId]: status }))
  }

  const refreshAllDots = useCallback(() => {
    if (!selectedGroup) return
    const month = format(calendarMonth, 'yyyy-MM')
    const [y, m] = month.split('-').map(Number)
    apiClient.getAttendanceDays(selectedGroup.id, month)
      .then((res) => setDaysWithAttendance(new Set(res.dates)))
      .catch(console.error)
    apiClient.getEmptySession(selectedGroup.id, '').then((sessions) => {
      const monthStr = `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}`
      setDaysWithEmptySession(new Set(sessions.filter((s: any) => s.date?.startsWith(monthStr)).map((s: any) => s.date)))
    }).catch(console.error)
  }, [selectedGroup, calendarMonth])

  const doSave = async () => {
    if (!selectedGroup) return
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const attendanceData = enrollments.map((enrollment) => ({
        student_id: enrollment.student,
        status: attendance[enrollment.id] || 'present',
        comments: '',
      }))
      await apiClient.markAttendanceBulk(selectedGroup.id, selectedDate, attendanceData)
      setSaveMessage({ type: 'success', text: '✓ Asistencia guardada correctamente' })
      setHasExisting(true)
      refreshAllDots()
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (error) {
      console.error('Failed to save attendance:', error)
      setSaveMessage({ type: 'error', text: 'Error al guardar la asistencia' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = () => {
    if (hasExisting) setShowConfirm(true)
    else doSave()
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    doSave()
  }

  const handleDeleteDay = async () => {
    if (!selectedGroup) return
    setIsDeleting(true)
    try {
      await apiClient.deleteAttendanceDay(selectedGroup.id, selectedDate)
      setHasExisting(false)
      const defaults: { [key: string]: string } = {}
      enrollments.forEach((e) => { defaults[e.id] = 'present' })
      setAttendance(defaults)
      setSaveMessage({ type: 'success', text: '✓ Asistencia del día eliminada correctamente' })
      refreshAllDots()
      setTimeout(() => setSaveMessage(null), 4000)
    } catch {
      setSaveMessage({ type: 'error', text: 'Error al eliminar la asistencia' })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleToggleEmptySession = async () => {
    if (!selectedGroup || isTogglingEmpty) return
    setIsTogglingEmpty(true)
    try {
      if (emptySessionId) {
        await apiClient.deleteEmptySession(emptySessionId)
        setEmptySessionId(null)
        setSaveMessage({ type: 'success', text: '✓ Clase sin alumnos desmarcada' })
      } else {
        const created = await apiClient.createEmptySession(selectedGroup.id, selectedDate)
        setEmptySessionId(created.id)
        setSaveMessage({ type: 'success', text: '✓ Día marcado como clase dada sin alumnos' })
      }
      refreshAllDots()
      setTimeout(() => setSaveMessage(null), 4000)
    } catch {
      setSaveMessage({ type: 'error', text: 'Error al actualizar el registro' })
    } finally {
      setIsTogglingEmpty(false)
    }
  }

  const handleSelectDate = (ds: string) => {
    setSelectedDate(ds)
    const m = startOfMonth(new Date(ds + 'T00:00:00'))
    if (format(m, 'yyyy-MM') !== format(calendarMonth, 'yyyy-MM')) {
      setCalendarMonth(m)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['teacher', 'manager', 'admin', 'owner']}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <PageHeader
            eyebrow="Académico"
            title="Asistencia"
            subtitle="Registra rápidamente la asistencia de tu clase."
          />

          {saveMessage && (
            <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
              {saveMessage.text}
            </div>
          )}

          {/* Mobile: calendar on top full-width. Desktop: side by side */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start">

            {/* Mobile-only calendar */}
            <div className="sm:hidden w-full">
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                daysWithAttendance={daysWithAttendance}
                daysWithEmptySession={daysWithEmptySession}
                calendarMonth={calendarMonth}
                onChangeMonth={setCalendarMonth}
              />
            </div>

            {/* Left: group + status summary + list */}
            <div className="flex-1 min-w-0 w-full">

              {/* Compact group selector */}
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 mb-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="text-xs font-medium text-gray-400 shrink-0">Grupo</label>
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedGroup?.id || ''}
                    onChange={(val) => {
                      const group = groups.find((g) => g.id === val)
                      setSelectedGroup(group || null)
                      setHasExisting(false)
                      setEmptySessionId(null)
                    }}
                    options={groups.map((g) => ({ value: g.id, label: `${g.name} (${g.level})` }))}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0">{format(new Date(selectedDate + 'T00:00:00'), 'dd/MM/yyyy')}</span>
              </div>

              {/* Empty session banner */}
              {emptySessionId && (
                <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-orange-800 text-xs">
                    <span className="text-base">🏫</span>
                    <span className="font-semibold">Clase dada sin alumnos</span>
                    <span className="text-orange-600">— se sumará 0.5h al reporte del teacher</span>
                  </div>
                  <button
                    onClick={handleToggleEmptySession}
                    disabled={isTogglingEmpty}
                    className="shrink-0 text-xs text-orange-700 border border-orange-300 bg-white hover:bg-orange-50 px-2 py-1 rounded transition"
                  >
                    Desmarcar
                  </button>
                </div>
              )}

              {/* Status summary bar */}
              {enrollments.length > 0 && (
                <div className={`mb-3 rounded-lg border px-3 py-2 flex items-center justify-between gap-2 flex-wrap ${hasExisting ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasExisting
                      ? <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Registrado</span>
                      : <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Nuevo</span>
                    }
                    {statusCounts.present > 0 && <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">✓ {statusCounts.present}</span>}
                    {statusCounts.absent > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">✗ {statusCounts.absent}</span>}
                    {statusCounts.late > 0 && <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">⏰ {statusCounts.late}</span>}
                    {statusCounts.excused > 0 && <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">📋 {statusCounts.excused}</span>}
                  </div>
                  {hasExisting && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-red-600 border border-red-300 bg-white hover:bg-red-50 text-xs font-medium transition"
                    >
                      🗑 Eliminar
                    </button>
                  )}
                </div>
              )}

              {/* Attendance List */}
              <div className="space-y-1.5">
                {enrollments.length > 0 ? (
                  <>
                    {enrollments.map((enrollment) => {
                      const status = attendance[enrollment.id] || 'present'
                      const rowColors: Record<string, string> = {
                        present: 'border-green-200 bg-green-50',
                        absent:  'border-red-200 bg-red-50',
                        late:    'border-orange-200 bg-orange-50',
                        excused: 'border-purple-200 bg-purple-50',
                      }
                      return (
                        <div key={enrollment.id} className={`rounded-lg border px-3 py-2 flex items-center justify-between transition ${rowColors[status] || 'border-gray-100 bg-white'}`}>
                          <p className="text-sm font-medium text-gray-900 truncate pr-2">{enrollment.student_name}</p>
                          <Select
                            size="sm"
                            value={status}
                            onChange={(val) => handleAttendanceChange(enrollment.id, val)}
                            options={[
                              { value: 'present', label: '✓ Presente' },
                              { value: 'absent',  label: '✗ Ausente' },
                              { value: 'late',    label: '⏰ Tarde' },
                              { value: 'excused', label: '📋 Justificado' },
                            ]}
                            className="w-36 shrink-0"
                          />
                        </div>
                      )
                    })}

                    <div className="pt-1 flex gap-2">
                      <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className={`flex-1 disabled:opacity-50 text-white font-medium text-sm py-2 px-4 rounded-lg transition ${hasExisting ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {isSaving ? '⏳ Guardando...' : hasExisting ? '⚠ Sobreescribir' : '✓ Guardar asistencia'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-100 p-6 text-center text-gray-500 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">No hay estudiantes inscriptos</p>
                      <p className="text-xs text-gray-400">Este grupo no tiene estudiantes todavía</p>
                    </div>
                    <button
                      onClick={handleToggleEmptySession}
                      disabled={isTogglingEmpty}
                      className={`w-full text-sm font-medium py-2 px-4 rounded-lg border transition ${
                        emptySessionId
                          ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {isTogglingEmpty ? '...' : emptySessionId ? '🏫 Clase dada sin alumnos (click para desmarcar)' : '🏫 Marcar clase dada sin alumnos'}
                    </button>
                  </div>
                )}

                {/* Empty session button — shown when there ARE students too */}
                {enrollments.length > 0 && !emptySessionId && (
                  <button
                    onClick={handleToggleEmptySession}
                    disabled={isTogglingEmpty}
                    className="w-full mt-1 text-xs font-medium py-1.5 px-3 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition"
                  >
                    🏫 Marcar como clase dada sin alumnos
                  </button>
                )}
              </div>
            </div>

            {/* Right: mini calendar — desktop only */}
            <div className="hidden sm:block w-56 shrink-0">
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                daysWithAttendance={daysWithAttendance}
                daysWithEmptySession={daysWithEmptySession}
                calendarMonth={calendarMonth}
                onChangeMonth={setCalendarMonth}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteDay}
        title="Eliminar asistencia del día"
        message={`¿Eliminar todos los registros de asistencia de ${selectedGroup?.name} del ${selectedDate}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        isLoading={isDeleting}
      />

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="text-base font-bold text-gray-900">¿Sobreescribir asistencia?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Ya existe un registro para <span className="font-semibold">{selectedGroup?.name}</span> el <span className="font-semibold">{selectedDate}</span>. Guardar ahora sobreescribirá todos los registros de este día.
            </p>
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg transition">
                Sí, sobreescribir
              </button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
