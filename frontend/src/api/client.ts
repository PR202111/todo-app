import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname
      if (path !== '/login' && path !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

export const tasksApi = {
  getAll: (params?: { category_id?: number; completed?: boolean; priority?: string }) =>
    api.get('/tasks', { params }),
  create: (data: object) => api.post('/tasks', data),
  update: (id: number, data: object) => api.patch(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  reorder: (items: { id: number; order: number }[]) => api.post('/tasks/reorder', items),
}

export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (data: object) => api.post('/categories', data),
  update: (id: number, data: object) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

export interface CodingProfile {
  id: number
  user_id: number
  platform: 'codeforces' | 'leetcode'
  username: string
  rating?: number
  max_rating?: number
  rank_name?: string
  global_rank?: number
  problems_solved: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  raw_stats_json?: string
  last_refreshed_at?: string
  created_at: string
  updated_at: string
  profile_url?: string
}

export interface Contest {
  id: number
  platform: 'codeforces' | 'leetcode'
  external_id: string
  name: string
  start_time: string
  duration_seconds: number
  url: string
  phase: string
  last_synced_at?: string
  is_interested: boolean
  preparation_task_id?: number
}

export interface CodingGoal {
  id: number
  user_id: number
  title: string
  goal_type: 'daily_problems' | 'weekly_problems' | 'weekly_days' | 'target_rating' | 'contest_prep'
  target_value: number
  current_value: number
  platform?: string
  deadline?: string
  is_active: boolean
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface StreakAnalytics {
  current_streak: number
  longest_streak: number
  weekly_consistency: number
  active_days_count: number
  total_problems_solved: number
  heatmap: { date: string; count: number; contests?: number; platforms: string[] }[]
  rating_history: { platform: string; date: string; rating: number; contest_name?: string; rank?: number }[]
}

export interface InAppNotification {
  id: number
  user_id: number
  title: string
  message: string
  notification_type: string
  is_read: boolean
  metadata_json?: string
  created_at: string
}

export interface ProgressReport {
  id: number
  user_id: number
  report_type: 'daily' | 'weekly'
  period_start: string
  period_end: string
  summary_json?: string
  created_at: string
}

export const codingProfilesApi = {
  getAll: () => api.get<CodingProfile[]>('/coding/profiles'),
  link: (data: { platform: string; username: string }) => api.post<CodingProfile>('/coding/profiles', data),
  refresh: (id: number) => api.post<CodingProfile>(`/coding/profiles/${id}/refresh`),
  unlink: (id: number) => api.delete(`/coding/profiles/${id}`),
}

export const contestsApi = {
  getAll: (params?: { platform?: string; upcoming_only?: boolean }) =>
    api.get<Contest[]>('/coding/contests', { params }),
  setPreference: (contestId: number, isInterested: boolean) =>
    api.post(`/coding/contests/${contestId}/preference`, { is_interested: isInterested }),
  createPrepareTask: (contestId: number, data?: { title?: string; priority?: string; due_date?: string }) =>
    api.post('/coding/contests/' + contestId + '/prepare-task', data || {}),
}

export const codingGoalsApi = {
  getAll: () => api.get<CodingGoal[]>('/coding/goals'),
  create: (data: Partial<CodingGoal>) => api.post<CodingGoal>('/coding/goals', data),
  update: (id: number, data: Partial<CodingGoal>) => api.patch<CodingGoal>(`/coding/goals/${id}`, data),
  delete: (id: number) => api.delete(`/coding/goals/${id}`),
}

export const codingAnalyticsApi = {
  get: () => api.get<StreakAnalytics>('/coding/analytics'),
  logActivity: (data: { platform?: string; activity_date: string; problems_solved: number; contests_attended?: number; points?: number; details?: string }) =>
    api.post('/coding/activity', data),
}

export const notificationsApi = {
  getAll: () => api.get<InAppNotification[]>('/coding/notifications'),
  markRead: (id: number) => api.post<InAppNotification>(`/coding/notifications/${id}/read`),
  markAllRead: () => api.post('/coding/notifications/read-all'),
}

export const progressReportsApi = {
  getAll: () => api.get<ProgressReport[]>('/coding/reports'),
  generate: (report_type: 'daily' | 'weekly') => api.post<ProgressReport>(`/coding/reports/generate?report_type=${report_type}`),
}

export interface Problem {
  id: number
  user_id: number
  title: string
  url?: string
  platform: string
  external_id: string
  topic?: string
  difficulty: string
  solve_status: string
  attempt_count: number
  first_attempt_at: string
  last_attempt_at: string
  solved_at?: string
  notes?: string
  revision_notes?: string
  is_bookmarked: boolean
  next_review_at?: string
  review_interval_days: number
  review_count: number
  ease_factor: number
  is_verified_submission: boolean
  created_at: string
  updated_at: string
}

export interface PracticePlan {
  weak_topics: { topic: string; total: number; solved: number; solve_rate: number }[]
  recommended_problems: Problem[]
  upcoming_contest_plans: { contest_id: number; contest_name: string; platform: string; start_time: string; prep_days_left: number }[]
  due_reviews_count: number
  rules_applied: string[]
}

export interface ContestPrepPlan {
  id: number
  contest_id: number
  user_id: number
  checklist_json?: string
  virtual_practice_notes?: string
  post_contest_reflection?: string
  completion_percentage: number
  created_at: string
  updated_at: string
  contest?: Contest
}

export interface AchievementItem {
  key: string
  title: string
  description: string
  icon: string
  is_unlocked: boolean
  unlocked_at?: string
  is_verified: boolean
}

export const problemsApi = {
  getAll: (params?: {
    search?: string
    platform?: string
    topic?: string
    difficulty?: string
    solve_status?: string
    is_bookmarked?: boolean
    due_only?: boolean
  }) => api.get<Problem[]>('/coding/problems', { params }),
  get: (id: number) => api.get<Problem>(`/coding/problems/${id}`),
  create: (data: Partial<Problem>) => api.post<Problem>('/coding/problems', data),
  update: (id: number, data: Partial<Problem>) => api.patch<Problem>(`/coding/problems/${id}`, data),
  delete: (id: number) => api.delete(`/coding/problems/${id}`),
  getRevisionQueue: () => api.get<Problem[]>('/coding/problems/revision/queue'),
  getPracticePlan: () => api.get<PracticePlan>('/coding/problems/plan'),
  recordReview: (id: number, data: { rating: 1 | 2 | 3 | 4; notes?: string }) =>
    api.post<Problem>(`/coding/problems/${id}/review`, data),
}

export const prepPlansApi = {
  get: (contestId: number) => api.get<ContestPrepPlan>(`/coding/contests/${contestId}/prep-plan`),
  update: (contestId: number, data: {
    checklist_json?: string
    virtual_practice_notes?: string
    post_contest_reflection?: string
    completion_percentage?: number
  }) => api.put<ContestPrepPlan>(`/coding/contests/${contestId}/prep-plan`, data),
}

export const achievementsApi = {
  getAll: () => api.get<AchievementItem[]>('/coding/achievements'),
}

export const exportsApi = {
  getJsonExportUrl: () => `${API_URL}/api/coding/export/json`,
  getProblemsCsvUrl: () => `${API_URL}/api/coding/export/problems/csv`,
}
