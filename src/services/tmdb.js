const API = 'https://api.themoviedb.org/3';
const key = import.meta.env.VITE_TMDB_API_KEY;

async function request(path, params = {}) {
  if (!key) throw new Error('VITE_TMDB_API_KEY is not configured. Copy .env.example to .env and add your TMDB key.');
  const url = new URL(API + path);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TMDB request failed (${response.status})`);
  return response.json();
}

export const imageUrl = (path, size = 'w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
export const searchMulti = (query) => request('/search/multi', { query, include_adult: false });
export const trending = () => request('/trending/all/week');
export const popularMovies = () => request('/movie/popular');
export const popularTv = () => request('/tv/popular');
export const details = (type, id) => request(`/${type}/${id}`, { append_to_response: 'videos,credits' });
export const seasons = (id, season) => request(`/tv/${id}/season/${season}`);
