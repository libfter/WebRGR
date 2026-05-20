import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import backgroundImage from '../ui/Background.png'

function HeartIcon({ filled }) {
    return (
        <svg viewBox="0 0 24 24" fill={filled ? '#ef5350' : 'none'} stroke={filled ? '#ef5350' : 'currentColor'} strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
    )
}

function UserIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        </svg>
    )
}

function LogoutIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
    )
}

export default function PlayerScreen() {
    const { user, endSession } = useSession()
    const navigate = useNavigate()
    const [mediaList, setMediaList] = useState([])
    const [currentMedia, setCurrentMedia] = useState(null)
    const [comments, setComments] = useState([])
    const [activeTab, setActiveTab] = useState('chat')
    const [messageText, setMessageText] = useState('')
    const chatEndRef = useRef(null)

    useEffect(() => {
        fetch('http://192.168.3.3:5000/api/media/list')
        .then(r => r.json())
        .then(data => {
            setMediaList(data)
            if (data.length > 0) setCurrentMedia(data[0])
        })
        .catch(err => console.error('Failed to load media', err))
    }, [])

    useEffect(() => {
        if (currentMedia) {
            fetch(`http://192.168.3.3:5000/api/media/${currentMedia.id}/comments`)
            .then(r => r.json())
            .then(setComments)
            .catch(err => console.error('Failed to load comments', err))
        }
    }, [currentMedia])

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [comments])

    const sendComment = async () => {
        if (!messageText.trim() || !currentMedia) return

            if (!user) {
                console.log('User not logged in')
                navigate('/login')
                return
            }

            try {
                const token = localStorage.getItem('access_token')

                const response = await fetch(`http://192.168.3.3:5000/api/media/${currentMedia.id}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        text: messageText
                    })
                })

                if (response.ok) {
                    const newComment = await response.json()
                    setComments(prev => [...prev, newComment])
                    setMessageText('')
                } else {
                    const error = await response.json()
                    console.error('Server error:', error)
                }
            } catch (err) {
                console.error('Failed to send comment', err)
            }
    }

    const likeComment = async (commentId) => {
        if (!user) {
            navigate('/login')
            return
        }
        try {
            const token = localStorage.getItem('access_token')
            const response = await fetch(`http://192.168.3.3:5000/api/comments/${commentId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, likes: data.likes, liked_by_me: data.liked } : c
                ))
            }
        } catch (err) {
            console.error('Failed to like comment', err)
        }
    }

    const handleLogout = () => {
        endSession()
        navigate('/login')
    }

    return (
        <>
        <div
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: -1
        }}
        />
        <div className="page">
        <header className="header">
        <div className="header-right">
        {user ? (
            <>
            <div className="header-user">
            <UserIcon />
            <span>{user.first_name} {user.last_name}</span>
            </div>
            {user.is_admin && (
                <button className="btn-register" onClick={() => navigate('/admin')}
                style={{ marginRight: 8 }}>
                Админка
                </button>
            )}
            <button className="icon-btn" onClick={handleLogout} title="Выйти">
            <LogoutIcon />
            </button>
            </>
        ) : (
            <>
            <button className="btn-register" onClick={() => navigate('/login')}>
            Войти
            </button>
            <button className="icon-btn" onClick={() => navigate('/login')}>
            <UserIcon />
            </button>
            </>
        )}
        </div>
        </header>

        <div className="video-page-content">
        <div className="video-area">
        {/* Плеер */}
        <div className="video-player-wrap">
        {currentMedia ? (
            <video
            key={currentMedia.id}
            controls
            style={{ width: '100%', height: '100%', background: '#000' }}
            >
            <source src={`http://192.168.3.3:5000/api/media/stream/${currentMedia.path}`} type="video/mp4" />
            </video>
        ) : (
            <div className="video-placeholder">
            <div className="play-icon-large">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            </div>
            <span>Нет доступных видео</span>
            </div>
        )}
        </div>

        {/* Чат */}
        <div className="chat-panel">
        <div className="chat-tabs">
        <button
        className={`chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => setActiveTab('chat')}
        >Чат</button>
        </div>

        <div className="chat-messages">
        {comments.length === 0 ? (
            <div className="empty-state" style={{ color: 'rgba(255,255,255,0.2)', padding: '32px 16px' }}>
            Сообщений пока нет
            </div>
        ) : (
            comments.map(c => (
                <div key={c.id} className="chat-message">
                <div className="chat-message-header">
                <span className="chat-username">{c.user_name || c.userName}</span>
                <button
                className={`chat-like-btn ${c.liked_by_me ? 'liked' : ''}`}
                onClick={() => likeComment(c.id)}
                >
                <HeartIcon filled={!!c.liked_by_me} />
                {c.likes}
                </button>
                </div>
                <div className="chat-text">{c.text}</div>
                </div>
            ))
        )}
        <div ref={chatEndRef} />
        </div>

        {user ? (
            <div className="chat-send-area">
            <div className="chat-input-row">
            <textarea
            className="chat-input"
            placeholder="Текст"
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
            rows={1}
            />
            <button className="chat-send-btn" onClick={sendComment}>Отправить</button>
            </div>
            <div className="chat-name-row">
            Имя в чате: <strong>{user.chat_name || user.first_name}</strong>
            </div>
            </div>
        ) : (
            <div className="chat-cta" onClick={() => navigate('/login')}>
            Хотите отправить сообщение?<br />
            Войдите в аккаунт.
            </div>
        )}
        </div>

        {currentMedia && (
            <div>
            <div className="video-title-display">{currentMedia.name || currentMedia.title}</div>
            {currentMedia.description && (
                <div className="video-description">{currentMedia.description}</div>
            )}
            </div>
        )}
        </div>
        {/* Карусель видео - плитки */}
        {mediaList.length > 0 && (
            <div style={{ marginTop: '20px' }}>
            <h3 style={{ color: 'white', marginBottom: '12px', fontSize: '18px' }}>Другие видео</h3>
            <div style={{
                display: 'flex',
                overflowX: 'auto',
                gap: '12px',
                paddingBottom: '10px'
            }}>
            {mediaList.map(video => (
                <div
                key={video.id}
                onClick={() => setCurrentMedia(video)}
                style={{
                    minWidth: '200px',
                    maxWidth: '200px',
                    background: currentMedia?.id === video.id ? '#e94560' : 'rgba(255,255,255,0.1)',
                                     borderRadius: '8px',
                                     cursor: 'pointer',
                                     transition: '0.2s'
                }}
                >
                <div style={{
                    background: '#000',
                    height: '110px',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                <span style={{ fontSize: '32px' }}></span>
                </div>
                <div style={{ padding: '8px' }}>
                <div style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                {video.name || video.title}
                </div>
                <div style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.5)',
                                     marginTop: '4px'
                }}>
                {video.upload_date ? new Date(video.upload_date).toLocaleDateString('ru-RU') : ''}
                </div>
                </div>
                </div>
            ))}
            </div>
            </div>
        )}

        </div>
        </div>
        </>
    )
}
