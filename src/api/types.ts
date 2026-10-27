export type Role = 'manager' | 'team_leader' | 'employee'

export interface LocationRef { id: number; name: string }

/** Working hours as 'HH:MM'; weekend_days uses 0 = Sunday … 6 = Saturday. */
export interface ScheduleValues {
  work_start: string
  work_end: string
  late_grace_minutes: number
  weekend_days: number[]
}
/** Effective schedule of an employee; `own` holds their overrides (null = company default). */
export interface UserSchedule extends ScheduleValues {
  custom: boolean
  own: { [K in keyof ScheduleValues]: ScheduleValues[K] | null }
}

export interface User {
  id: number
  employee_code: string | null
  name: string
  email: string
  national_id: string | null
  phone: string | null
  job_title: string | null
  branch: string | null
  role: Role
  team_id: number | null
  team_name: string | null
  supervisor_id: number | null
  supervisor_name: string | null
  hire_date: string | null
  basic_salary?: number
  annual_leave_balance: number
  casual_leave_balance: number
  is_active: boolean
  created_at: string
  avatar_url: string | null
  locations: LocationRef[]
  schedule?: UserSchedule
}

export interface LeaveBucket { total: number; used: number; pending: number; remaining: number }
export interface LeaveBalances {
  year: string
  annual: LeaveBucket
  casual: LeaveBucket
  sick: { used: number; pending: number }
  unpaid: { used: number; pending: number }
}

export interface Team {
  id: number
  name: string
  description: string | null
  leader_id: number | null
  leader_name: string | null
  member_count: number
  members?: Pick<User, 'id' | 'name' | 'email' | 'job_title' | 'role' | 'is_active' | 'avatar_url'>[]
}

export interface Location {
  id: number
  name: string
  address: string | null
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  assigned_count: number
  users?: { id: number; name: string; job_title: string | null }[]
}

export interface AttendanceRecord {
  id: number
  user_id: number
  user_name: string
  user_avatar_url: string | null
  employee_code: string | null
  team_name: string | null
  work_date: string
  check_in_at: string | null
  check_out_at: string | null
  check_in_time: string | null
  check_out_time: string | null
  check_in_location: string | null
  check_out_location: string | null
  late_minutes: number
  is_late: boolean
  worked_minutes: number | null
  check_out_method: 'manual' | 'left_location' | 'admin' | null
  left_location: boolean
  away_minutes: number
  note: string | null
  edited_by: number | null
}

export type BoardStatus = 'present' | 'late' | 'absent' | 'on_leave' | 'day_off' | 'not_yet'
export interface BoardRow {
  id: number
  name: string
  avatar_url: string | null
  employee_code: string | null
  job_title: string | null
  team_name: string | null
  status: BoardStatus
  record: AttendanceRecord | null
  /** This employee's effective working hours for the day. */
  work_start?: string
  work_end?: string
}
export interface Board { date: string; is_working_day: boolean; counts: Partial<Record<BoardStatus, number>>; rows: BoardRow[] }

export interface MonthSummary {
  month: string
  working_days: number
  present_days: number
  late_days: number
  total_late_minutes: number
  absent_days: number
  absent_dates: string[]
  excused_days: number
  worked_hours: number
}

export type RequestType = 'leave' | 'allowance' | 'mission' | 'early_leave' | 'overtime' | 'complaint'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export interface HrRequest {
  id: number
  user_id: number
  user_name: string
  user_avatar_url: string | null
  employee_code: string | null
  job_title: string | null
  team_name: string | null
  type: RequestType
  leave_type: 'annual' | 'casual' | 'sick' | 'unpaid' | null
  start_date: string | null
  end_date: string | null
  days: number | null
  start_time: string | null
  hours: number | null
  amount: number | null
  destination: string | null
  reason: string | null
  status: RequestStatus
  reviewer_name: string | null
  review_note: string | null
  reviewed_at: string | null
  created_at: string
}

export interface Payslip {
  id: number
  user_id: number
  user_name: string
  employee_code: string | null
  month: string
  basic_salary: number
  earnings: Record<string, number>
  deductions: Record<string, number>
  total_earnings: number
  total_deductions: number
  net_salary: number
  status: 'draft' | 'published'
  updated_at: string
}

export interface Adjustment {
  id: number
  user_id: number
  user_name: string
  kind: 'penalty' | 'reward'
  amount: number
  reason: string
  date: string
  created_by_name: string | null
}

export interface HrDocument {
  id: number
  user_id: number
  user_name: string
  title: string
  status: 'missing' | 'submitted' | 'approved' | 'rejected'
  original_name: string | null
  note: string | null
  updated_at: string
  has_file: boolean
}

export interface Settings {
  company_name: string
  timezone: string
  work_start: string
  work_end: string
  late_grace_minutes: number
  weekend_days: number[]
  default_annual_leave: number
  default_casual_leave: number
  required_documents: string[]
  currency: string
  auto_checkout_on_leave: boolean
}

export interface Holiday { date: string; name: string }

export interface Overview {
  date: string
  employees: number
  teams: number
  locations: number
  today: Partial<Record<BoardStatus, number>>
  is_working_day: boolean
  requests: Record<RequestStatus, number>
  pending_requests: HrRequest[]
  attendance_trend: { date: string; on_time: number; late: number }[]
  period: {
    from: string
    to: string
    employees: {
      user_id: number
      name: string
      employee_code: string | null
      team_name: string | null
      avatar_url: string | null
      worked_hours: number
      attendance_days: number
      absent_days: number
      late_days: number
      excused_days: number
      attendance_rate: number
    }[]
  }
}
