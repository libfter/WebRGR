Веб-приложение для просмотра видео с чатом и лайками.

## Технологии

- React 18
- Flask
- SQLite

## Структура

```
/
├── server/
│   ├── main.py
│   ├── requirements.txt
│   └── media_files/
└── client/
    ├── src/
    │   ├── screens/
    │   ├── hooks/
    │   └── ui/
    └── package.json
```

## Запуск

### Backend

```bash
cd server
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
cd client
npm install
npm run dev
```

## API

| Метод | URL |
|-------|-----|
| POST | /api/register |
| POST | /api/authenticate |
| GET | /api/user/me |
| GET | /api/media/list |
| GET | /api/media/stream/<filename> |
| POST | /api/media/upload |
| DELETE | /api/media/<id> |
| GET | /api/media/<id>/comments |
| POST | /api/media/<id>/comments |
| POST | /api/comments/<id>/like |

## Аккаунт админа

admin@admin.com / admin123
