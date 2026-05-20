import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from './hooks/useSession'
import LoginScreen from './screens/LoginScreen'
import PlayerScreen from './screens/PlayerScreen'
import Dashboard from './screens/Dashboard'

export default function Router() {
    return (
        <SessionProvider>
        <BrowserRouter>
        <Routes>
        <Route path="/" element={<Navigate to="/watch" replace />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/watch" element={<PlayerScreen />} />
        <Route path="/admin" element={<Dashboard />} />
        </Routes>
        </BrowserRouter>
        </SessionProvider>
    )
}
