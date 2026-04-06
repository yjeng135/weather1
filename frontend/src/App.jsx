import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, MapPin, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, 
  CloudRain, CloudSnow, CloudLightning, Droplets, Wind, 
  Thermometer, Loader2, Sparkles, Moon 
} from 'lucide-react';

// WMO 날씨 코드 매핑
const WMO_CODES = {
  0: { label: '맑음', icon: Sun, color: 'text-yellow-400' },
  1: { label: '대체로 맑음', icon: CloudSun, color: 'text-yellow-300' },
  2: { label: '부분적으로 흐림', icon: Cloud, color: 'text-gray-400' },
  3: { label: '흐림', icon: Cloud, color: 'text-gray-500' },
  45: { label: '안개', icon: CloudFog, color: 'text-gray-400' },
  48: { label: '서리 낀 안개', icon: CloudFog, color: 'text-gray-400' },
  51: { label: '가벼운 이슬비', icon: CloudDrizzle, color: 'text-blue-300' },
  53: { label: '보통 이슬비', icon: CloudDrizzle, color: 'text-blue-400' },
  55: { label: '강한 이슬비', icon: CloudDrizzle, color: 'text-blue-500' },
  61: { label: '가벼운 비', icon: CloudRain, color: 'text-blue-400' },
  63: { label: '보통 비', icon: CloudRain, color: 'text-blue-500' },
  65: { label: '강한 비', icon: CloudRain, color: 'text-blue-600' },
  71: { label: '가벼운 눈', icon: CloudSnow, color: 'text-blue-200' },
  73: { label: '보통 눈', icon: CloudSnow, color: 'text-blue-200' },
  75: { label: '강한 눈', icon: CloudSnow, color: 'text-blue-300' },
  77: { label: '싸락눈', icon: CloudSnow, color: 'text-blue-200' },
  80: { label: '가벼운 소나기', icon: CloudRain, color: 'text-blue-400' },
  81: { label: '보통 소나기', icon: CloudRain, color: 'text-blue-500' },
  82: { label: '강한 소나기', icon: CloudRain, color: 'text-blue-600' },
  95: { label: '뇌우', icon: CloudLightning, color: 'text-yellow-500' },
};

export default function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState('C');
  const [activeLocation, setActiveLocation] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // 백엔드 서버를 통해 AI 추천 가져오기
  const fetchAiRecommendation = useCallback(async (weatherData) => {
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('http://localhost:5000/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weatherData: {
            condition: WMO_CODES[weatherData.code]?.label || '흐림',
            temp: weatherData.temp,
            feelsLike: weatherData.feelsLike,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed
          }
        })
      });

      if (!response.ok) throw new Error('AI 서버 응답 실패');

      const data = await response.json();
      setAiRecommendation(data.recommendation);
    } catch (err) {
      console.error('AI Error:', err);
      setAiError('스타일 추천을 가져오지 못했습니다.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // 기상 데이터 페칭 (Open-Meteo)
  const fetchWeatherData = useCallback(async (lat, lon, locationName, isAutoUpdate = false) => {
    if (!isAutoUpdate) setLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`);
      if (!res.ok) throw new Error('기상 정보를 가져오지 못했습니다.');
      
      const data = await res.json();
      const newWeather = {
        location: locationName,
        temp: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        code: data.current.weather_code,
        isDay: data.current.is_day
      };
      
      setWeather(newWeather);
      setActiveLocation({ lat, lon, name: locationName });
      
      if (!isAutoUpdate) {
        setError(null);
        fetchAiRecommendation(newWeather);
      }
    } catch (err) {
      if (!isAutoUpdate) setError(err.message);
    } finally {
      if (!isAutoUpdate) setLoading(false);
    }
  }, [fetchAiRecommendation]);

  const fetchWeatherByCityName = useCallback(async (cityName) => {
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ko&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) throw new Error(`'${cityName}'을 찾을 수 없습니다.`);
      const { latitude, longitude, name, country } = geoData.results[0];
      const displayName = country ? `${name}, ${country}` : name;
      await fetchWeatherData(latitude, longitude, displayName);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [fetchWeatherData]);

  useEffect(() => {
    fetchWeatherByCityName('Seoul');
  }, [fetchWeatherByCityName]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      fetchWeatherByCityName(query);
      setQuery('');
    }
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      setError('위치 정보를 지원하지 않습니다.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const revRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ko`);
        const revData = await revRes.json();
        const name = revData.city || revData.locality || '내 위치';
        await fetchWeatherData(latitude, longitude, name);
      } catch {
        await fetchWeatherData(latitude, longitude, '현재 위치');
      }
    }, () => {
      setError('위치 권한을 허용해주세요.');
      setLoading(false);
    });
  };

  const getWeatherInfo = (code, isDay) => {
    const info = WMO_CODES[code] || { label: '흐림', icon: Cloud, color: 'text-gray-400' };
    if (!isDay && code === 0) return { ...info, icon: Moon, color: 'text-indigo-200' };
    return info;
  };

  const convertTemp = (c) => unit === 'C' ? c : (c * 9/5) + 32;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-1000 ${
      weather?.isDay ? 'bg-gradient-to-br from-blue-400 to-indigo-600' : 'bg-gradient-to-br from-slate-800 to-indigo-950'
    }`}>
      <div className="bg-white/95 backdrop-blur-lg rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 sm:p-8">
        
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="도시 검색 (Seoul, Tokyo...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-400 outline-none transition-all shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <button onClick={handleLocation} type="button" className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors shadow-sm">
              <MapPin className="w-5 h-5" />
            </button>
            <button onClick={() => setUnit(u => u === 'C' ? 'F' : 'C')} type="button" className="p-3 bg-gray-100 text-gray-700 rounded-2xl font-bold w-12 hover:bg-gray-200 shadow-sm">
              {unit}
            </button>
          </form>
        </div>

        <div className="min-h-[400px] flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-blue-500">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">최신 날씨를 가져오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center p-6 bg-red-50 text-red-500 rounded-3xl border border-red-100">
              <p className="font-medium">{error}</p>
            </div>
          ) : weather ? (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-1">{weather.location}</h2>
                <p className="text-gray-500 font-medium mb-4 text-sm">{new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트</p>
                
                <div className="my-6 flex justify-center">
                  {React.createElement(getWeatherInfo(weather.code, weather.isDay).icon, {
                    className: `w-32 h-32 ${getWeatherInfo(weather.code, weather.isDay).color} drop-shadow-xl`,
                    strokeWidth: 1.5
                  })}
                </div>

                <div className="flex items-start justify-center gap-1 mb-1">
                  <span className="text-7xl font-black text-gray-900 tracking-tighter">
                    {Math.round(convertTemp(weather.temp))}
                  </span>
                  <span className="text-3xl font-bold text-gray-400 mt-2">°</span>
                </div>
                
                <p className="text-xl font-bold text-gray-600 mb-8">
                  {getWeatherInfo(weather.code, weather.isDay).label}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                  <Thermometer className="w-5 h-5 text-orange-500 mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-bold text-center">FEELS LIKE</span>
                  <span className="text-sm font-bold text-gray-700">{Math.round(convertTemp(weather.feelsLike))}°</span>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                  <Droplets className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-bold text-center">HUMIDITY</span>
                  <span className="text-sm font-bold text-gray-700">{weather.humidity}%</span>
                </div>
                <div className="bg-teal-50 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                  <Wind className="w-5 h-5 text-teal-500 mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-bold text-center">WIND</span>
                  <span className="text-sm font-bold text-gray-700">{Math.round(weather.windSpeed)}k/h</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 border border-white shadow-sm relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-12 h-12 text-purple-600" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-purple-100 p-1.5 rounded-lg">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider">AI Style Suggestion</h3>
                </div>
                
                {aiLoading ? (
                  <div className="flex items-center gap-3 py-2 text-purple-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">분석 중...</span>
                  </div>
                ) : aiError ? (
                  <p className="text-sm text-red-400 font-medium py-1">{aiError}</p>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed font-medium break-keep italic">
                    "{aiRecommendation}"
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}