const KEY = 'movie-series-tv-store-v1';
const initial = { myList: [], progress: {} };

export function loadStore() {
  try { return { ...initial, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return initial; }
}

export function saveStore(store) { localStorage.setItem(KEY, JSON.stringify(store)); }
export function toggleMyList(item) {
  const store = loadStore();
  const id = `${item.media_type || item.type}-${item.id}`;
  const exists = store.myList.some(x => x.key === id);
  store.myList = exists ? store.myList.filter(x => x.key !== id) : [{ key: id, ...item }, ...store.myList];
  saveStore(store); return store;
}
export function setProgress(item, seconds) {
  const store = loadStore();
  const key = `${item.media_type || item.type}-${item.id}${item.episode ? `-${item.episode}` : ''}`;
  store.progress[key] = { ...item, seconds, updatedAt: Date.now() };
  saveStore(store); return store;
}
