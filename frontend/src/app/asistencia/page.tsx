'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Group, Enrollment } from '@/types'
import { format } from 'date-fns'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Select } from '@/components/Select'

export default function AttendancePage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasExisting, setHasExisting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Load enrollments when group changes
  useEffect(() => {
    if (!selectedGroup) return
    apiClient.getGroup(selectedGroup.id).then((groupData) => {
      const enrollmentsData: Enrollment[] = groupData.enrollments || []
      setEnrollments(enrollmentsData)
      // Reset to all-present as default; existing check will overwrite below
      const defaults: { [key: string]: string } = {}
      enrollmentsData.forEach((e) => { defaults[e.id] = 'present' })
      setAttendance(defaults)
    }).catch(console.error)
  }, [selectedGroup])

  // Check for existing attendance whenever group or date changes
  useEffect(() => {
    if (!selectedGroup || !selectedDate || enrollments.length === 0) {
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

      // Pre-populate form with existing values (match by student id)
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

  const handleAttendanceChange = (enrollmentId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [enrollmentId]: status }))
  }

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
      setSaveMessage({ type: 'success', text: '✓ Attendance saved successfully!' })
      setHasExisting(true)
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (error) {
      console.error('Failed to save attendance:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save attendance' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = () => {
    if (hasExisting) {
      setShowConfirm(true)
    } else {
      doSave()
    }
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
      setSaveMessage({ type: 'success', text: '✓ Attendance deleted for this day.' })
      setTimeout(() => setSaveMessage(null), 4000)
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to delete attendance.' })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
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
            <div className={`mb-6 px-4 py-3 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
              {saveMessage.text}
            </div>
          )}

          {/* Group + Date Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grupo</label>
              <Select
                value={selectedGroup?.id || ''}
                onChange={(val) => {
                  const group = groups.find((g) => g.id === val)
                  setSelectedGroup(group || null)
                  setHasExisting(false)
                }}
                options={groups.map((g) => ({ value: g.id, label: `${g.name} (${g.level})` }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Existing attendance warning */}
          {hasExisting && (
            <div className="mb-4 flex items-start justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-lg leading-none shrink-0">⚠</span>
                <div>
                  <p className="font-semibold">Attendance already recorded for this date</p>
                  <p className="text-amber-700 mt-0.5">The existing values are loaded below. Saving will overwrite them.</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="shrink-0 px-3 py-1.5 rounded-md text-red-600 border border-red-300 bg-white hover:bg-red-50 text-xs font-medium transition"
              >
                Delete day
              </button>
            </div>
          )}

          {/* Attendance List */}
          <div className="space-y-2">
            {enrollments.length > 0 ? (
              <>
                {enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between hover:shadow-md transition">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{enrollment.student_name}</p>
                    </div>
                    <Select
                      size="sm"
                      value={attendance[enrollment.id] || 'present'}
                      onChange={(val) => handleAttendanceChange(enrollment.id, val)}
                      options={[
                        { value: 'present', label: '✓ Present' },
                        { value: 'absent',  label: '✗ Absent' },
                        { value: 'late',    label: '⏰ Late' },
                        { value: 'excused', label: '📋 Excused' },
                      ]}
                      className="w-36"
                    />
                  </div>
                ))}

                {/* Save Button */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3 mt-4">
                  <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    className={`w-full disabled:opacity-50 text-white font-medium text-sm py-2 px-4 rounded-md transition ${hasExisting ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isSaving ? '⏳ Saving...' : hasExisting ? '⚠ Overwrite Attendance' : '✓ Save Attendance'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                <p className="text-sm font-medium mb-1">No hay estudiantes inscriptos</p>
                <p className="text-xs">Este grupo no tiene estudiantes todavía</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteDay}
        title="Eliminar asistencia del día"
        message={`¿Eliminar todos los registros de asistencia de ${selectedGroup?.name} del ${selectedDate}? Esta acción afecta el cálculo de horas del teacher y no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        isLoading={isDeleting}
      />

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-gray-900">Overwrite attendance?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Attendance for <span className="font-semibold">{selectedGroup?.name}</span> on <span className="font-semibold">{selectedDate}</span> has already been recorded. Saving now will overwrite all existing records for this date.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Yes, overwrite
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
