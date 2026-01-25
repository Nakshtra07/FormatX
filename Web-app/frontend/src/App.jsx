import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Pricing from './pages/Pricing'

function App() {
    const [user, setUser] = useState(null)
    const [accessToken, setAccessToken] = useState(null)

    // Check for existing session on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('access_token')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser) {
            setAccessToken(storedToken)
            setUser(JSON.parse(storedUser))
        }
    }, [])

    const handleLogin = (userData, token) => {
        setUser(userData)
        setAccessToken(token)
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify(userData))
    }

    const handleLogout = () => {
        setUser(null)
        setAccessToken(null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
    }

    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
                <Route
                    path="/"
                    element={
                        user ? (
                            <Navigate to="/dashboard" replace />
                        ) : (
                            <Landing onLogin={handleLogin} />
                        )
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        user ? (
                            <Dashboard
                                user={user}
                                accessToken={accessToken}
                                onLogout={handleLogout}
                            />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />
                <Route
                    path="/pricing"
                    element={
                        user ? (
                            <Pricing
                                user={user}
                                accessToken={accessToken}
                            />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />
            </Routes>
        </BrowserRouter>
    )
}

export default App
