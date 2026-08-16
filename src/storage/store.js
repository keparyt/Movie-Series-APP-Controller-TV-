const KEY = 'movie-series-tv-store-v2';
const initial = { myList: [], progress: {}, history: [] };

export function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...initial, ...parsed, history: Array.isArray(parsed.history) ? parsed.history : [] };
  } catch { return { ...initial }; }
}

export function saveStore(store) { localStorage.setItem(KEY, JSON.stringify(store)); }

export function toggleMyList(item) {
  const store = loadStore();
  const id = `${item.media_type || item.type}-${item.id}`;
  const exists = store.myList.some(x => x.key === id);
  store.myList = exists ? store.myList.filter(x => x.key !== id) : [{ key: id, ...item }, ...store.myList];
  saveStore(store); return store;
}

export function setProgress(item, seconds, duration = 0) {
  const store = loadStore();
  const key = `${item.media_type || item.type}-${item.id}${item.episode ? `-${item.episode}` : ''}`;
  store.progress[key] = { ...item, seconds, duration, updatedAt: Date.now() };
  saveStore(store); return store;
}

export function addHistory(item, kind = 'view') {
  const store = loadStore();
  const type = item.media_type || item.type || (item.first_air_date ? 'tv' : 'movie');
  const key = `${type}-${item.id}${item.episode ? `-${item.episode}` : ''}`;
  const entry = { ...item, type, key, kind, visitedAt: Date.now() };
  store.history = [entry, ...store.history.filter(x => x.key !== key)].slice(0, 100);
  saveStore(store); return store;
}

export function clearHistory() {
  const store = loadStore();
  store.history = [];
  saveStore(store); return store;
}
