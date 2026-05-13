import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

class APIClient {
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  async login(email: string, password: string) {
    const response = await this.axiosInstance.post('/auth/login/', {
      email,
      password,
    })
    return response.data
  }

  async getMe() {
    const response = await this.axiosInstance.get('/auth/users/me/')
    return response.data
  }

  async getOrganizations() {
    const response = await this.axiosInstance.get('/organizations/')
    return response.data
  }

  async getGroups(orgSlug?: string) {
    const response = await this.axiosInstance.get('/groups/', {
      params: orgSlug ? { organization: orgSlug } : {},
    })
    return response.data
  }

  async getGroup(id: string) {
    const response = await this.axiosInstance.get(`/groups/${id}/`)
    return response.data
  }

  async createGroup(data: any) {
    const response = await this.axiosInstance.post('/groups/', data)
    return response.data
  }

  async updateGroup(id: string, data: any) {
    const response = await this.axiosInstance.put(`/groups/${id}/`, data)
    return response.data
  }

  async deleteGroup(id: string) {
    await this.axiosInstance.delete(`/groups/${id}/`)
  }

  async enrollStudent(groupId: string, studentId: string) {
    const response = await this.axiosInstance.post(`/groups/${groupId}/enroll/`, {
      student_id: studentId,
    })
    return response.data
  }

  async getStudents() {
    const response = await this.axiosInstance.get('/students/')
    return response.data
  }

  async getStudent(id: string) {
    const response = await this.axiosInstance.get(`/students/${id}/`)
    return response.data
  }

  async createStudent(data: any) {
    const response = await this.axiosInstance.post('/students/', data)
    return response.data
  }

  async updateStudent(id: string, data: any) {
    const response = await this.axiosInstance.put(`/students/${id}/`, data)
    return response.data
  }

  async deleteStudent(id: string) {
    await this.axiosInstance.delete(`/students/${id}/`)
  }

  async getTeachers() {
    const response = await this.axiosInstance.get('/teachers/')
    return response.data
  }

  async getAttendance(groupId?: string, date?: string) {
    const params: any = {}
    if (groupId) params.group = groupId
    if (date) params.date = date

    const response = await this.axiosInstance.get('/attendance/', { params })
    return response.data
  }

  async markAttendanceBulk(groupId: string, date: string, attendance: any[]) {
    const response = await this.axiosInstance.post('/attendance/bulk/', {
      group_id: groupId,
      date,
      attendance,
    })
    return response.data
  }

  async getReports(type: 'attendance' | 'students' | 'groups') {
    const response = await this.axiosInstance.get(`/reports/${type}/`)
    return response.data
  }

  async getAttendanceReport(period: 'month' | 'semester' | 'year') {
    const response = await this.axiosInstance.get('/reports/attendance/', { params: { period } })
    return response.data
  }

  async getStudentsReport(companyId?: string) {
    const params: any = {}
    if (companyId) params.company_id = companyId
    const response = await this.axiosInstance.get('/reports/students/', { params })
    return response.data
  }

  async getCorporateClients() {
    const response = await this.axiosInstance.get('/corporate-clients/')
    return response.data
  }

  async createCorporateClient(data: any) {
    const response = await this.axiosInstance.post('/corporate-clients/', data)
    return response.data
  }

  async updateCorporateClient(id: string, data: any) {
    const response = await this.axiosInstance.put(`/corporate-clients/${id}/`, data)
    return response.data
  }

  async deleteCorporateClient(id: string) {
    await this.axiosInstance.delete(`/corporate-clients/${id}/`)
  }

  async getCertificates() {
    const response = await this.axiosInstance.get('/certificates/')
    return response.data
  }

  async getEvaluations() {
    const response = await this.axiosInstance.get('/evaluations/')
    return response.data
  }

  async getEnrollments() {
    const response = await this.axiosInstance.get('/enrollments/')
    return response.data
  }

  async getStudentProgress(userId: string) {
    const response = await this.axiosInstance.get(`/students/${userId}/progress/`)
    return response.data
  }

  async getOrganizationStats(orgSlug: string) {
    const response = await this.axiosInstance.get(`/organizations/${orgSlug}/stats/`)
    return response.data
  }

  async register(data: any) {
    const response = await this.axiosInstance.post('/auth/register/', data)
    return response.data
  }

  async getUsers() {
    const response = await this.axiosInstance.get('/auth/users/')
    return response.data
  }

  async getUser(id: string) {
    const response = await this.axiosInstance.get(`/auth/users/${id}/`)
    return response.data
  }

  async updateUser(id: string, data: any) {
    const response = await this.axiosInstance.put(`/auth/users/${id}/`, data)
    return response.data
  }

  async deleteUser(id: string) {
    await this.axiosInstance.delete(`/auth/users/${id}/`)
  }

  async updateOrganization(slug: string, data: { name?: string; brand_name?: string }) {
    const response = await this.axiosInstance.patch(`/organizations/${slug}/`, data)
    return response.data
  }

  async resetUserPassword(id: string, password?: string) {
    const response = await this.axiosInstance.post(
      `/auth/users/${id}/reset_password/`,
      password ? { password } : {}
    )
    return response.data
  }
}

export const apiClient = new APIClient()
