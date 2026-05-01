export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'super_admin' | 'owner' | 'manager' | 'teacher' | 'corporate_client' | 'student'
  organization_id: string
  is_active: boolean
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  license_number: string
  status: 'trial' | 'active' | 'suspended' | 'inactive'
  max_users: number
  is_active: boolean
  user_count: number
  created_at: string
}

export interface Teacher {
  id: string
  user: string
  user_email: string
  user_name: string
  specializations: string[]
  bio: string
  certifications: string[]
  created_at: string
}

export interface Student {
  id: string
  user: string
  user_email: string
  user_name: string
  corporate_client: string | null
  corporate_client_name: string | null
  english_level: 'beginner' | 'elementary' | 'pre-intermediate' | 'intermediate' | 'upper-intermediate' | 'advanced'
  enrollment_date: string
  is_active: boolean
  created_at: string
}

export interface Group {
  id: string
  name: string
  level: string
  teacher: string
  teacher_name: string
  schedule: {
    days: string[]
    time: string
    duration: number
  }
  start_date: string
  end_date: string | null
  max_students: number
  enrollment_count: number
  available_spots: number
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  description: string
  created_at: string
}

export interface Enrollment {
  id: string
  group: string
  group_name: string
  student: string
  student_name: string
  enrolled_at: string
  status: 'active' | 'completed' | 'dropped' | 'suspended'
  drop_reason: string
  drop_date: string | null
  created_at: string
}

export interface Attendance {
  id: string
  group: string
  group_name: string
  student: string
  student_name: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  comments: string
  created_at: string
}

export interface Evaluation {
  id: string
  group: string
  student: string
  student_name: string
  type: 'test' | 'oral' | 'writing' | 'listening' | 'participation'
  score: number
  max_score: number
  percentage: number
  date: string
  notes: string
  created_at: string
}

export interface Certificate {
  id: string
  student: string
  student_name: string
  group: string
  group_name: string
  level_achieved: string
  issue_date: string
  certificate_number: string
  pdf_url: string
  issued_by: string
  issued_by_name: string
  notes: string
  created_at: string
}
