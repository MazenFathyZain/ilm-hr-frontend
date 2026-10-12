import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Loading } from './components/ui'
import { AdjustmentsPage } from './pages/AdjustmentsPage'
import { AttendancePage } from './pages/AttendancePage'
import { DocumentsPage } from './pages/DocumentsPage'
import { EmployeeDetailPage } from './pages/EmployeeDetailPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { LocationsPage } from './pages/LocationsPage'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { PayrollPage } from './pages/PayrollPage'
import { RequestsPage } from './pages/RequestsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamsPage } from './pages/TeamsPage'

function ManagerOnly({ children }: { children: ReactNode }) {
  const { isManager } = useAuth()
  return isManager ? children : <Navigate to="/" replace />
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="payroll" element={<ManagerOnly><PayrollPage /></ManagerOnly>} />
        <Route path="adjustments" element={<ManagerOnly><AdjustmentsPage /></ManagerOnly>} />
        <Route path="documents" element={<ManagerOnly><DocumentsPage /></ManagerOnly>} />
        <Route path="settings" element={<ManagerOnly><SettingsPage /></ManagerOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
