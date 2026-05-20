import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export default function AuthPage() {
    const [mode, setMode] = useState('login') //  login | signup
    const [userEmail, setUserEmail] = useState('')
    const [userPassword, setUserPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [errorText, setErrorText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const { signIn, signUp } = useSession()
    const navigate = useNavigate()

    const handleSignUp = async (e) => {
        e.preventDefault()
        setErrorText('')
        if (!userEmail || !userPassword || !firstName || !lastName) {
            setErrorText('Заполните все обязательные поля')
            return
        }
        setIsLoading(true)
        try {
            await signUp(userEmail, userPassword, firstName, lastName)
            navigate('/watch')
        } catch (err) {
            setErrorText(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignIn = async (e) => {
        e.preventDefault()
        setErrorText('')
        setIsLoading(true)
        try {
            await signIn(userEmail, userPassword)
            navigate('/watch')
        } catch (err) {
            setErrorText(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
        <div className="bg-picture" />
        <div className="page">
        <header className="header">
        </header>

        <main className="auth-page">
        <div className="auth-tabs">
        <button
        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
        onClick={() => { setMode('login'); setErrorText('') }}
        >
        Войти
        </button>
        <button
        className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
        onClick={() => { setMode('signup'); setErrorText('') }}
        >
        Регистрация
        </button>
        </div>

        {mode === 'signup' ? (
            <div className="auth-card">
            <form onSubmit={handleSignUp}>
            <div className="auth-section-title">Данные для авторизации</div>

            {errorText && <div className="global-error">{errorText}</div>}

            <div className="form-group">
            <label className="form-label">Электронная почта *</label>
            <input
            className="form-input"
            type="email"
            placeholder="my_email@mail.com"
            value={userEmail}
            onChange={e => setUserEmail(e.target.value)}
            autoComplete="email"
            />
            </div>

            <div className="form-group">
            <label className="form-label">Пароль *</label>
            <input
            className="form-input"
            type="password"
            placeholder="Ваш пароль"
            value={userPassword}
            onChange={e => setUserPassword(e.target.value)}
            autoComplete="new-password"
            />
            </div>

            <div style={{ marginTop: 20, marginBottom: 16 }} className="auth-section-title">
            Прочие данные
            </div>

            <div className="form-group">
            <label className="form-label">Фамилия *</label>
            <input
            className="form-input"
            type="text"
            placeholder="Ваша фамилия"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            />
            </div>

            <div className="form-group">
            <label className="form-label">Имя *</label>
            <input
            className="form-input"
            type="text"
            placeholder="Ваше имя"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            />
            </div>

            <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Отправка...' : 'Отправить'}
            </button>
            <p className="form-note">* поле, обязательное для заполнения</p>
            </form>
            </div>
        ) : (
            <div className="auth-card">
            <form onSubmit={handleSignIn}>
            <div className="auth-section-title">Вход в аккаунт</div>
            {errorText && <div className="global-error">{errorText}</div>}
            <div className="form-group">
            <label className="form-label">Электронная почта</label>
            <input
            className="form-input"
            type="email"
            placeholder="mail@mail.com"
            value={userEmail}
            onChange={e => setUserEmail(e.target.value)}
            autoComplete="email"
            />
            </div>
            <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
            className="form-input"
            type="password"
            placeholder="Ваш пароль"
            value={userPassword}
            onChange={e => setUserPassword(e.target.value)}
            autoComplete="current-password"
            />
            </div>
            <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Вход...' : 'Войти'}
            </button>
            </form>
            </div>
        )}
        </main>
        </div>
        </>
    )
}
