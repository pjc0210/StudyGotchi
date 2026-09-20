import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ForgotPage, LoginPage, RegisterPage, TwoFactorPage } from './pages/Auth'
import { EarthPage } from './pages/Earth'
import { MainPage } from './pages/Main'
import { StoreProvider } from './store'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/earth" element={<EarthPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
