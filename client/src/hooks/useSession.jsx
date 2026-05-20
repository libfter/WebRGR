import { createContext, useContext, useState, useEffect } from 'react'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const savedToken = localStorage.getItem('access_token')
        if (savedToken) {
            fetch('/api/user/me', {
                headers: { Authorization: `Bearer ${savedToken}` }
            })
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (data) setUser(data)
            })
            .finally(() => setIsLoading(false))
        } else {
            setIsLoading(false)
        }
    }, [])

    const signIn = async (email, password) => {
        const response = await fetch('/api/authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Ошибка входа')
            localStorage.setItem('access_token', data.token)
            localStorage.setItem('user_data', JSON.stringify(data.user))
            setUser(data.user)
            return data.user
    }

    const signUp = async (email, password, first_name, last_name) => {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, first_name, last_name })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Ошибка регистрации')
            localStorage.setItem('access_token', data.token)
            localStorage.setItem('user_data', JSON.stringify(data.user))
            setUser(data.user)
            return data.user
    }

    const endSession = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_data')
        setUser(null)
    }

    return (
        <SessionContext.Provider value={{ user, isLoading, signIn, signUp, endSession }}>
        {children}
        </SessionContext.Provider>
    )
}

export const useSession = () => {
    const context = useContext(SessionContext)
    if (!context) {
        throw new Error('useSession must be used within SessionProvider')
    }
    return context
}
