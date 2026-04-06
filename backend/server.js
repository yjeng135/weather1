const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const axios = require('axios');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const geminiApiKey = process.env.GEMINI_API_KEY;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('허용되지 않은 출처입니다.'));
    },
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/recommendation', async (req, res) => {
  try {
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const weatherData = req.body?.weatherData;

    if (!weatherData) {
      return res.status(400).json({ error: 'weatherData가 필요합니다.' });
    }

    const prompt = [
      `현재 날씨는 ${weatherData.condition}입니다.`,
      `기온은 ${weatherData.temp}도, 체감 온도는 ${weatherData.feelsLike}도입니다.`,
      `습도는 ${weatherData.humidity}%이고 풍속은 ${weatherData.windSpeed}km/h입니다.`,
      '이 날씨에 어울리는 옷차림이나 스타일을 한국어로 2문장 이내로 추천해 주세요.',
      '마크다운이나 특수기호 없이 자연스러운 문장만 반환해 주세요.',
    ].join(' ');

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }
    );

    const recommendation =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '추천 문장을 생성하지 못했습니다.';

    res.json({ recommendation });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const message =
      error.response?.data?.error?.message || error.message || '서버 오류가 발생했습니다.';

    console.error('Gemini recommendation error:', message);
    res.status(statusCode).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
