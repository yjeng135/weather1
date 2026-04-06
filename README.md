# Weather

React + Vite 프론트엔드와 Node.js + Express 백엔드로 구성된 날씨 추천 프로젝트입니다.

## Stack

- Frontend: React, Vite, lucide-react
- Backend: Node.js, Express, Axios, dotenv, cors
- Weather API: Open-Meteo
- AI Recommendation: Gemini API
- Deployment: Netlify (frontend), Render (backend)

## Folder Structure

```text
weather/
|- frontend/
`- backend/
```

## Local Development

### Backend

```bash
cd backend
npm install
npm start
```

`backend/.env`

```env
GEMINI_API_KEY=your_gemini_api_key
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Deployment

### Render

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

환경변수:

```env
GEMINI_API_KEY=your_gemini_api_key
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
```

### Netlify

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

환경변수:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

## API

### `POST /api/recommendation`

```json
{
  "weatherData": {
    "condition": "맑음",
    "temp": 21,
    "feelsLike": 22,
    "humidity": 40,
    "windSpeed": 5
  }
}
```

## Notes

- `backend/.env`와 `frontend/.env`는 GitHub에 올리지 않습니다.
- 예시 환경변수는 `backend/.env.example`, `frontend/.env.example`를 사용하면 됩니다.
