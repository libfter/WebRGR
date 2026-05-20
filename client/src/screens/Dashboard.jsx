import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export default function Dashboard() {
    const { user, logout } = useSession()
    const navigate = useNavigate()
    const [mediaList, setMediaList] = useState([])
    const [mediaTitle, setMediaTitle] = useState('')
    const [mediaDesc, setMediaDesc] = useState('')
    const [mediaFile, setMediaFile] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const fileInputRef = useRef()

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }
        if (!user.is_admin) {
            navigate('/watch')
            return
        }
        loadMediaList()
    }, [user])

    const loadMediaList = () => {
        fetch('http://192.168.3.3:5000/api/media/list')
        .then(r => r.json())
        .then(setMediaList)
        .catch(err => console.error('Failed to load media', err))
    }

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!mediaFile || !mediaTitle.trim()) {
            setErrorMsg('Укажите название и выберите файл')
            return
        }
        setErrorMsg('')
        setSuccessMsg('')
        setIsUploading(true)

        const formData = new FormData()
        formData.append('video', mediaFile)
            formData.append('title', mediaTitle)
                formData.append('description', mediaDesc)

                    try {
                        const token = localStorage.getItem('access_token')  // ← добавить

                        const response = await fetch('http://192.168.3.3:5000/api/media/upload', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`  // ← добавить
                            },
                            body: formData
                        })

                        const data = await response.json()
                        if (!response.ok) throw new Error(data.error || 'Ошибка загрузки')

                            setSuccessMsg(`Видео "${mediaTitle}" успешно загружено!`)
                            setMediaTitle('')
                            setMediaDesc('')
                            setMediaFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                                loadMediaList()
                    } catch (err) {
                        setErrorMsg(err.message)
                    } finally {
                        setIsUploading(false)
                    }
    }

    const handleDelete = async (mediaId, mediaTitle) => {
        if (!window.confirm(`Удалить видео "${mediaTitle}"?`)) return

            try {
                const token = localStorage.getItem('access_token')

                const response = await fetch(`http://192.168.3.3:5000/api/media/${mediaId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (response.ok) {
                    setMediaList(prev => prev.filter(v => v.id !== mediaId))
                    setSuccessMsg(`Видео "${mediaTitle}" удалено.`)
                } else {
                    const error = await response.json()
                    setErrorMsg(error.error || 'Ошибка при удалении')
                }
            } catch (err) {
                setErrorMsg(err.message)
            }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <>
        <div className="bg-picture" />
        <div className="page">
        <header className="header">
        <div className="header-right">
        <div className="header-user">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>{user?.first_name || user?.username} {user?.last_name || ''}</span>
        </div>
        <button className="btn-register" onClick={() => navigate('/watch')} style={{ marginRight: 8 }}>
        Плеер
        </button>
        <button className="icon-btn" onClick={handleLogout}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        </button>
        </div>
        </header>

        <div className="admin-content">
        <h1 className="admin-title">Панель администратора</h1>

        {successMsg && <div className="success-msg" style={{ marginBottom: 16 }}>{successMsg}</div>}

        <div className="admin-grid">
        {/* Форма загрузки */}
        <div className="admin-card">
        <div className="admin-card-title">Загрузить видео</div>
        <form className="upload-form" onSubmit={handleUpload}>
        {errorMsg && <div className="global-error">{errorMsg}</div>}

        <div>
        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>
        Название *
        </label>
        <input
        className="admin-input"
        type="text"
        placeholder="Название видео"
        value={mediaTitle}
        onChange={e => setMediaTitle(e.target.value)}
        />
        </div>

        <div>
        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>
        Описание
        </label>
        <textarea
        className="admin-input"
        placeholder="Описание видео (необязательно)"
        value={mediaDesc}
        onChange={e => setMediaDesc(e.target.value)}
        rows={3}
        style={{ resize: 'vertical' }}
        />
        </div>

        <div className="file-input-wrap">
        <label className="file-input-label" htmlFor="media-file">
        {mediaFile ? `✓ ${mediaFile.name}` : '+ Выбрать видеофайл (MP4, WebM...)'}
        </label>
        <input
        id="media-file"
        ref={fileInputRef}
        className="file-input"
        type="file"
        accept="video/*"
        onChange={e => setMediaFile(e.target.files[0])}
        />
        </div>

        <button className="btn-primary" type="submit" disabled={isUploading}>
        {isUploading ? 'Загрузка...' : 'Загрузить видео'}
        </button>
        </form>
        </div>

        {/* Список видео */}
        <div className="admin-card">
        <div className="admin-card-title">
        Видео на платформе ({mediaList.length})
        </div>
        <div className="video-list">
        {mediaList.length === 0 ? (
            <div className="empty-state">Видео не загружены</div>
        ) : (
            mediaList.map(v => (
                <div key={v.id} className="video-item">
                <div className="video-item-info">
                <div className="video-item-title">{v.name || v.title}</div>
                <div className="video-item-date">
                {v.upload_date ? new Date(v.upload_date).toLocaleDateString('ru-RU') : ''}
                </div>
                </div>
                <button className="btn-delete" onClick={() => handleDelete(v.id, v.name || v.title)}>
                Удалить
                </button>
                </div>
            ))
        )}
        </div>
        </div>
        </div>
        </div>
        </div>
        </>
    )
}
