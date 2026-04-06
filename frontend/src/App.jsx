import { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  Moon,
  Search,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

const WEATHER_CODES = {
  0: { label: '맑음', icon: Sun, theme: 'sunny' },
  1: { label: '대체로 맑음', icon: CloudSun, theme: 'sunny' },
  2: { label: '구름 조금', icon: CloudSun, theme: 'cloudy' },
  3: { label: '흐림', icon: Cloud, theme: 'cloudy' },
  45: { label: '안개', icon: CloudFog, theme: 'mist' },
  48: { label: '서리 안개', icon: CloudFog, theme: 'mist' },
  51: { label: '약한 이슬비', icon: CloudDrizzle, theme: 'rainy' },
  53: { label: '보통 이슬비', icon: CloudDrizzle, theme: 'rainy' },
  55: { label: '강한 이슬비', icon: CloudDrizzle, theme: 'rainy' },
  61: { label: '약한 비', icon: CloudRain, theme: 'rainy' },
  63: { label: '보통 비', icon: CloudRain, theme: 'rainy' },
  65: { label: '강한 비', icon: CloudRain, theme: 'rainy' },
  71: { label: '약한 눈', icon: CloudSnow, theme: 'snowy' },
  73: { label: '보통 눈', icon: CloudSnow, theme: 'snowy' },
  75: { label: '강한 눈', icon: CloudSnow, theme: 'snowy' },
  77: { label: '싸락눈', icon: CloudSnow, theme: 'snowy' },
  80: { label: '약한 소나기', icon: CloudRain, theme: 'rainy' },
  81: { label: '보통 소나기', icon: CloudRain, theme: 'rainy' },
  82: { label: '강한 소나기', icon: CloudRain, theme: 'rainy' },
  95: { label: '뇌우', icon: CloudLightning, theme: 'storm' },
};

function getWeatherInfo(code, isDay) {
  if (!isDay && code === 0) {
    return { label: '맑은 밤', icon: Moon, theme: 'night' };
  }

  return WEATHER_CODES[code] || { label: '흐림', icon: Cloud, theme: 'cloudy' };
}

function formatTemperature(value, unit) {
  const converted = unit === 'C' ? value : (value * 9) / 5 + 32;
  return `${Math.round(converted)}°${unit}`;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('C');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchAiRecommendation = useCallback(async (weatherData) => {
    setAiLoading(true);
    setAiError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weatherData: {
            condition: getWeatherInfo(weatherData.code, weatherData.isDay).label,
            temp: weatherData.temp,
            feelsLike: weatherData.feelsLike,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI 추천을 불러오지 못했습니다.');
      }

      setAiRecommendation(data.recommendation || '');
    } catch (fetchError) {
      setAiError(fetchError.message);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const fetchWeatherData = useCallback(async (lat, lon, locationName) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`
      );

      if (!response.ok) {
        throw new Error('날씨 정보를 불러오지 못했습니다.');
      }

      const data = await response.json();
      const current = data.current;

      const nextWeather = {
        location: locationName,
        temp: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        code: current.weather_code,
        isDay: Boolean(current.is_day),
      };

      setWeather(nextWeather);
      await fetchAiRecommendation(nextWeather);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchAiRecommendation]);

  const fetchWeatherByCityName = useCallback(async (cityName) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ko&format=json`
      );

      if (!response.ok) {
        throw new Error('도시 정보를 찾지 못했습니다.');
      }

      const data = await response.json();
      const result = data.results?.[0];

      if (!result) {
        throw new Error(`"${cityName}" 도시를 찾지 못했습니다.`);
      }

      const displayName = result.country ? `${result.name}, ${result.country}` : result.name;
      await fetchWeatherData(result.latitude, result.longitude, displayName);
    } catch (fetchError) {
      setError(fetchError.message);
      setLoading(false);
    }
  }, [fetchWeatherData]);

  useEffect(() => {
    fetchWeatherByCityName('Seoul');
  }, [fetchWeatherByCityName]);

  function handleSearch(event) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    fetchWeatherByCityName(query.trim());
    setQuery('');
  }

  function handleLocation() {
    if (!navigator.geolocation) {
      setError('브라우저에서 위치 정보를 지원하지 않습니다.');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=ko`
          );
          const data = await response.json();
          const locationName = data.city || data.locality || '현재 위치';

          await fetchWeatherData(coords.latitude, coords.longitude, locationName);
        } catch {
          await fetchWeatherData(coords.latitude, coords.longitude, '현재 위치');
        }
      },
      () => {
        setError('위치 권한을 허용해 주세요.');
        setLoading(false);
      }
    );
  }

  const weatherInfo = weather ? getWeatherInfo(weather.code, weather.isDay) : null;
  const WeatherIcon = weatherInfo?.icon || Cloud;
  const pageTheme = weatherInfo?.theme || 'cloudy';

  return (
    <div className={`app-shell theme-${pageTheme}`}>
      <main className="weather-card">
        <section className="hero-panel">
          <p className="eyebrow">Global Weather Studio</p>
          <h1>도시별 날씨와 AI 스타일 추천</h1>
          <p className="hero-copy">
            Open-Meteo 날씨 데이터와 Gemini 추천 문장을 한 화면에서 확인할 수 있습니다.
          </p>
        </section>

        <form className="search-bar" onSubmit={handleSearch}>
          <label className="search-input">
            <Search size={18} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="도시 검색 (Seoul, Tokyo, Paris...)"
            />
          </label>
          <button type="button" className="icon-button" onClick={handleLocation} aria-label="현재 위치">
            <MapPin size={18} />
          </button>
          <button
            type="button"
            className="unit-button"
            onClick={() => setUnit((currentUnit) => (currentUnit === 'C' ? 'F' : 'C'))}
          >
            °{unit}
          </button>
        </form>

        <section className="content-panel">
          {loading && (
            <div className="state-box">
              <Loader2 className="spin" size={36} />
              <p>최신 날씨 정보를 불러오는 중입니다.</p>
            </div>
          )}

          {!loading && error && (
            <div className="state-box error-box">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && weather && (
            <>
              <div className="summary-panel">
                <div>
                  <p className="location-name">{weather.location}</p>
                  <p className="timestamp">
                    {new Date().toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    업데이트
                  </p>
                </div>
                <WeatherIcon className="weather-icon" strokeWidth={1.6} />
              </div>

              <div className="temperature-row">
                <strong>{formatTemperature(weather.temp, unit)}</strong>
                <span>{weatherInfo.label}</span>
              </div>

              <div className="metrics-grid">
                <article className="metric-card">
                  <Thermometer size={18} />
                  <span>체감 온도</span>
                  <strong>{formatTemperature(weather.feelsLike, unit)}</strong>
                </article>
                <article className="metric-card">
                  <Droplets size={18} />
                  <span>습도</span>
                  <strong>{weather.humidity}%</strong>
                </article>
                <article className="metric-card">
                  <Wind size={18} />
                  <span>풍속</span>
                  <strong>{Math.round(weather.windSpeed)} km/h</strong>
                </article>
              </div>

              <article className="ai-card">
                <div className="ai-header">
                  <span className="ai-badge">
                    <Sparkles size={14} />
                    AI 추천
                  </span>
                  <p>현재 날씨에 어울리는 스타일 한 줄</p>
                </div>

                {aiLoading && (
                  <div className="ai-loading">
                    <Loader2 className="spin" size={16} />
                    <span>추천 문장을 생성하는 중입니다.</span>
                  </div>
                )}

                {!aiLoading && aiError && <p className="ai-error">{aiError}</p>}

                {!aiLoading && !aiError && (
                  <p className="ai-text">
                    {aiRecommendation || '잠시 후 AI 추천 문장이 여기에 표시됩니다.'}
                  </p>
                )}
              </article>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
