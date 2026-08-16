import React, { useEffect, useMemo, useState } from 'react';
import { details, imageUrl, popularMovies, popularTv, searchMulti, trending } from './services/tmdb.js';
import { loadStore, saveStore, toggleMyList } from './storage/store.js';

const typeName = x => x.media_type === 'tv' || x.first_air_date ? 'tv' : 'movie';

function Card({ item, onSelect }) {
  return <button className="card" onClick={() => onSelect(item)}>
    <img src={imageUrl(item.poster_path)} alt="" />
    <span>{item.title || item.name}</span>
    <small>{(item.release_date || item.first_air_date || '').slice(0,4)}</small>
  </button>;
}

function App() {
  const [page, setPage] = useState('home');
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [store, setStore] = useState(loadStore());
  const [loading, setLoading] = useState(true);

  const refreshHome = async () => {
    setLoading(true); setError('');
    try { const data = await trending(); setItems(data.results || []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { refreshHome(); }, []);

  async function navigate(next) {
    setPage(next); setSelected(null); setError('');
    if (next === 'home') return refreshHome();
    if (next === 'mylist') { setItems(loadStore().myList); setLoading(false); return; }
    setLoading(true);
    try { setItems(next === 'movies' ? (await popularMovies()).results : (await popularTv()).results); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function select(item) {
    setError('');
    try { setSelected(await details(typeName(item), item.id)); }
    catch (e) { setError(e.message); }
  }

  async function search(e) {
    e.preventDefault(); if (!query.trim()) return refreshHome();
    setLoading(true); setError(''); setPage('search');
    try { setItems((await searchMulti(query.trim())).results.filter(x => ['movie','tv'].includes(x.media_type))); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  const hero = useMemo(() => items[0], [items]);
  const listed = selected ? [] : items;

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')}>MOVIE<span>+</span></button>
      <nav>
        {['home','movies','tv','mylist'].map(x => <button key={x} className={page===x?'active':''} onClick={() => navigate(x)}>{x === 'tv' ? 'Series' : x === 'mylist' ? 'My List' : x[0].toUpperCase()+x.slice(1)}</button>)}
      </nav>
      <form onSubmit={search} className="search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search movies & series"/><button>⌕</button></form>
    </header>

    <main>
      {error && <div className="error">{error}</div>}
      {selected ? <DetailsView item={selected} store={store} setStore={setStore} onBack={() => setSelected(null)} /> : <>
        {hero && page === 'home' && <section className="hero" style={{backgroundImage:`linear-gradient(90deg,#080808 15%,rgba(8,8,8,.72),rgba(8,8,8,.18)),url(${imageUrl(hero.backdrop_path,'original')})`}}><div><p className="eyebrow">TRENDING THIS WEEK</p><h1>{hero.title || hero.name}</h1><p>{hero.overview}</p><button className="primary" onClick={()=>select(hero)}>View Details</button></div></section>}
        <section className="content"><div className="sectionTitle"><h2>{page === 'mylist' ? 'My List' : page === 'search' ? `Results for “${query}”` : page === 'movies' ? 'Popular Movies' : page === 'tv' ? 'Popular Series' : 'Trending Now'}</h2><span>{items.length} titles</span></div>
          {loading ? <div className="loading">Loading…</div> : listed.length ? <div className="grid">{listed.map(item => <Card key={`${item.media_type || typeName(item)}-${item.id}`} item={item} onSelect={select}/>)}</div> : <div className="empty">Nothing to show here.</div>}
        </section>
        {Object.values(store.progress).length > 0 && page === 'home' && <section className="content"><div className="sectionTitle"><h2>Continue Watching</h2></div><div className="progressList">{Object.values(store.progress).slice(0,8).map((p,i)=><button key={i} onClick={()=>select(p)}><img src={imageUrl(p.poster_path,'w342')}/><span>{p.title || p.name}</span></button>)}</div></section>}
      </>}
    </main>
  </div>;
}

function DetailsView({ item, store, setStore, onBack }) {
  const type = item.title ? 'movie' : 'tv';
  const listed = store.myList.some(x => x.key === `${type}-${item.id}`);
  const play = () => {
    const url = type === 'movie' ? `https://www.vidking.net/embed/movie/${item.id}` : `https://www.vidking.net/embed/tv/${item.id}/1/1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  return <section className="details"><button className="back" onClick={onBack}>← Back</button><div className="detailHero" style={{backgroundImage:`linear-gradient(90deg,#080808 12%,rgba(8,8,8,.8),rgba(8,8,8,.1)),url(${imageUrl(item.backdrop_path,'original')})`}}><div className="detailInfo"><p className="eyebrow">{type.toUpperCase()}</p><h1>{item.title || item.name}</h1><p>{item.overview}</p><div className="actions"><button className="primary" onClick={play}>▶ Play</button><button onClick={()=>setStore(toggleMyList({...item, type}))}>{listed ? '✓ In My List' : '+ My List'}</button></div><div className="meta">{item.vote_average?.toFixed(1)} ★ &nbsp; {item.release_date || item.first_air_date || ''}</div></div></div></section>;
}

export default App;
