import type { WeatherForecast } from '../types';

let memoryBearerToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryBearerToken = token;
}

export function getAuthToken(): string | null {
  return memoryBearerToken;
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (memoryBearerToken) {
    headers.set('Authorization', `Bearer ${memoryBearerToken}`);
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof File) &&
    !(options.body instanceof Blob) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      `Erro na requisição (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const CITY_COORDINATES: Record<
  string,
  { lat: number; lng: number; label: string }
> = {
  'São Paulo': { lat: -23.5505, lng: -46.6333, label: 'São Paulo, SP' },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro, RJ' },
  'Belo Horizonte': { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte, MG' },
  Curitiba: { lat: -25.4284, lng: -49.2733, label: 'Curitiba, PR' },
  Salvador: { lat: -12.9714, lng: -38.5014, label: 'Salvador, BA' },
  'Porto Alegre': { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre, RS' },
  Brasília: { lat: -15.7975, lng: -47.8919, label: 'Brasília, DF' },
};

export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Céu Limpo';
  if (code >= 1 && code <= 3) return 'Parcialmente Nublado';
  if (code === 45 || code === 48) return 'Neblina';
  if (code >= 51 && code <= 67) return 'Chuva Leve a Moderada';
  if (code >= 71 && code <= 77) return 'Neve / Geada';
  if (code >= 80 && code <= 82) return 'Pancadas de Chuva';
  if (code >= 95) return 'Tempestade';
  return 'Tempo Estável';
}

export async function fetchOpenMeteoWeather(
  cityName: string
): Promise<WeatherForecast> {
  const coords = CITY_COORDINATES[cityName] || CITY_COORDINATES['São Paulo'];
  const fallback: WeatherForecast = {
    city: coords.label,
    temperature: 26,
    apparentTemperature: 27,
    humidity: 58,
    windSpeed: 14,
    weatherCode: 2,
    minTemp: 19,
    maxTemp: 28,
    daily: [
      { date: 'Hoje', min: 19, max: 28, code: 2 },
      { date: 'Amanhã', min: 20, max: 29, code: 1 },
      { date: 'Sex', min: 18, max: 26, code: 61 },
      { date: 'Sáb', min: 17, max: 25, code: 0 },
    ],
    updatedAt: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=America%2FSao_Paulo&forecast_days=4`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return fallback;

    const json = (await res.json()) as {
      current?: {
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
      };
      daily?: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weather_code: number[];
      };
    };

    if (!json.current || !json.daily) return fallback;

    const dayLabels = ['Hoje', 'Amanhã'];
    const daily = json.daily.time.slice(0, 4).map((isoDate, idx) => {
      let label = dayLabels[idx];
      if (!label) {
        const d = new Date(`${isoDate}T12:00:00`);
        label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      }
      return {
        date: label,
        min: Math.round(json.daily!.temperature_2m_min[idx] ?? 18),
        max: Math.round(json.daily!.temperature_2m_max[idx] ?? 27),
        code: json.daily!.weather_code[idx] ?? 1,
      };
    });

    return {
      city: coords.label,
      temperature: Math.round(json.current.temperature_2m),
      apparentTemperature: Math.round(json.current.apparent_temperature),
      humidity: Math.round(json.current.relative_humidity_2m),
      windSpeed: Math.round(json.current.wind_speed_10m),
      weatherCode: json.current.weather_code,
      minTemp: daily[0]?.min ?? 18,
      maxTemp: daily[0]?.max ?? 27,
      daily,
      updatedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return fallback;
  }
}
