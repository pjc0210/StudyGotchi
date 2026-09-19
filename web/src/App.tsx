import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ForgotPage, LoginPage, RegisterPage, TwoFactorPage } from './pages/Auth'
import { ClassroomsPage } from './pages/Classrooms'
import { FriendWorldPage, FriendsPage } from './pages/Friends'
import { GraphPage } from './pages/Graph'
import { HomePage } from './pages/Home'
import { SettingsPage } from './pages/Settings'
import { UploadPage } from './pages/Upload'
import { WorldPage } from './pages/World'
import { StoreProvider, useStore } from './store'
import type { ReactNode } from 'react'

function Gate({ children }: { children: ReactNode }) {
  const { user, pendingTwoFactor } = useStore()
  if (pendingTwoFactor) return <Navigate to="/2fa" replace />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />
          <Route
            element={
              <Gate>
                <Layout />
              </Gate>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/world" element={<WorldPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/friends/:id" element={<FriendWorldPage />} />
            <Route path="/classrooms" element={<ClassroomsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
