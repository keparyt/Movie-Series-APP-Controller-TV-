import React, { useEffect, useMemo, useRef, useState } from 'react';
import { details, imageUrl, popularMovies, popularTv, searchMulti, trending } from './services/tmdb.js';
import { addHistory, clearHistory, loadStore, saveStore, setProgress, toggleMyList } from './storage/store.js';

const typeName = x => x.media_type === 'tv' || x.first_air_date ? 'tv' : 'movie';

function Card({ item, onSelect }) {
  return <button className="card" onClick={() => onSelect(item)}>
    <div className="poster"><img src={imageUrl(item.poster_path)} alt="" /><span className="posterGlow" /></div>
    <span>{item.title || item.name}</span>
    <small>{(item.release_date || item.first_air_date || '').slice(0,4)} · {item.vote_average ? `${item.vote_average.toFixed(1)} ★` : 'New'}</small>
  </button>;
}

function App() {
  const [page, setPage] = useState('home');
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [player, setPlayer] = useState(null);
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
    setPage(next); setSelected(null); setPlayer(null); setError('');
    if (next === 'home') return refreshHome();
    if (next === 'mylist') { setItems(loadStore().myList); setLoading(false); return; }
    if (next === 'history') { setItems(loadStore().history); setLoading(false); return; }
    setLoading(true);
    try { setItems(next === 'movies' ? (await popularMovies()).results : (await popularTv()).results); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function select(item) {
    setError('');
    try {
      const full = await details(typeName(item), item.id);
      const updated = addHistory(full, 'details');
      setStore(updated);
      setSelected(full);
    } catch (e) { setError(e.message); }
  }

  async function search(e) {
    e.preventDefault(); if (!query.trim()) return refreshHome();
    setLoading(true); setError(''); setPage('search'); setSelected(null); setPlayer(null);
    try { setItems((await searchMulti(query.trim())).results.filter(x => ['movie','tv'].includes(x.media_type))); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  function openPlayer(item) {
    const type = item.title ? 'movie' : 'tv';
    const url = type === 'movie'
      ? `https://www.vidking.net/embed/movie/${item.id}?autoplay=true&color=d6ad54`
      : `https://www.vidking.net/embed/tv/${item.id}/1/1?autoplay=true&color=d6ad54`;
    const updated = addHistory(item, 'play');
    setStore(updated);
    setPlayer({ item, type, url });
    setSelected(null);
  }

  const hero = useMemo(() => items[0], [items]);
  const listed = selected || player ? [] : items;

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')} aria-label="Home"><span className="brandMark">M</span><span className="brandText">MOVIE</span><b>+</b></button>
      <nav aria-label="Primary navigation">
        {['home','movies','tv','mylist','history'].map(x => <button key={x} className={page===x?'active':''} onClick={() => navigate(x)}>{x === 'tv' ? 'Series' : x === 'mylist' ? 'My List' : x === 'history' ? 'History' : x[0].toUpperCase()+x.slice(1)}</button>)}
      </nav>
      <form onSubmit={search} className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search movies & series"/><button aria-label="Search">↵</button></form>
    </header>

    <main>
      {error && <div className="error">{error}</div>}
      {player ? <PlayerView player={player} store={store} setStore={setStore} onClose={() => setPlayer(null)} /> : selected ? <DetailsView item={selected} store={store} setStore={setStore} onBack={() => setSelected(null)} onPlay={() => openPlayer(selected)} /> : <>
        {hero && page === 'home' && <section className="hero" style={{backgroundImage:`linear-gradient(90deg,#07080b 8%,rgba(7,8,11,.82) 42%,rgba(7,8,11,.15) 100%),url(${imageUrl(hero.backdrop_path,'original')})`}}><div><p className="eyebrow">✦ TRENDING THIS WEEK</p><h1>{hero.title || hero.name}</h1><p>{hero.overview}</p><div className="heroActions"><button className="primary" onClick={()=>select(hero)}>View Details</button><button className="ghost" onClick={()=>openPlayer(hero)}>▶ Play Now</button></div></div></section>}
        <section className="content"><div className="sectionTitle"><div><p className="eyebrow">{page === 'history' ? 'YOUR ACTIVITY' : 'DISCOVER'}</p><h2>{page === 'mylist' ? 'My List' : page === 'history' ? 'Recently Viewed' : page === 'search' ? `Results for “${query}”` : page === 'movies' ? 'Popular Movies' : page === 'tv' ? 'Popular Series' : 'Trending Now'}</h2></div><span>{items.length} titles</span>{page === 'history' && items.length > 0 && <button className="clearBtn" onClick={() => { const next=clearHistory(); setStore(next); setItems([]); }}>Clear History</button>}</div>
          {loading ? <div className="loading"><i /> Loading your library…</div> : listed.length ? <div className="grid">{listed.map(item => <Card key={`${item.key || item.media_type || typeName(item)}-${item.id}`} item={item} onSelect={select}/>)}</div> : <div className="empty"><strong>{page === 'history' ? 'Your history is empty' : 'Nothing to show here.'}</strong><span>{page === 'history' ? 'Movies and series you open will appear here.' : 'Try another section or search for something new.'}</span></div>}
        </section>
        {Object.values(store.progress).length > 0 && page === 'home' && <section className="content"><div className="sectionTitle"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2>Continue Watching</h2></div></div><div className="progressList">{Object.values(store.progress).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,8).map((p,i)=><button key={i} onClick={()=>openPlayer(p)}><img src={imageUrl(p.poster_path,'w342')}/><span>{p.title || p.name}</span><small>{p.seconds ? `${Math.floor(p.seconds/60)} min watched` : 'Resume'}</small></button>)}</div></section>}
        {store.history.length > 0 && page === 'home' && <section className="content"><div className="sectionTitle"><div><p className="eyebrow">RECENTLY VISITED</p><h2>History</h2></div><button className="textBtn" onClick={()=>navigate('history')}>See all →</button></div><div className="historyStrip">{store.history.slice(0,6).map(item=><button key={item.key} onClick={()=>select(item)}><img src={imageUrl(item.poster_path,'w342')}/><div><strong>{item.title || item.name}</strong><small>{item.kind === 'play' ? 'Played' : 'Viewed'} · {new Date(item.visitedAt).toLocaleDateString()}</small></div></button>)}</div></section>}
      </>}
    </main>
  </div>;
}

function DetailsView({ item, store, setStore, onBack, onPlay }) {
  const type = item.title ? 'movie' : 'tv';
  const listed = store.myList.some(x => x.key === `${type}-${item.id}`);
  return <section className="details"><button className="back" onClick={onBack}>← Back</button><div className="detailHero" style={{backgroundImage:`linear-gradient(90deg,#07080b 10%,rgba(7,8,11,.84) 45%,rgba(7,8,11,.08)),url(${imageUrl(item.backdrop_path,'original')})`}}><div className="detailInfo"><p className="eyebrow">{type.toUpperCase()} · {item.release_date || item.first_air_date || '—'}</p><h1>{item.title || item.name}</h1><p>{item.overview}</p><div className="actions"><button className="primary" onClick={onPlay}>▶ Play Now</button><button className="secondary" onClick={()=>setStore(toggleMyList({...item, type}))}>{listed ? '✓ In My List' : '+ My List'}</button></div><div className="meta">{item.vote_average?.toFixed(1)} ★ &nbsp; {item.runtime ? `${item.runtime} min` : type === 'tv' ? 'Series' : 'Movie'}</div></div></div></section>;
}

function PlayerView({ player, store, setStore, onClose }) {
  const [playing, setPlaying] = useState(false);
  const startedAt = useRef(Date.now());
  const frameRef = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      if (elapsed > 2) setStore(setProgress(player.item, elapsed));
    }, 10000);
    return () => clearInterval(timer);
  }, [player.item, setStore]);
  useEffect(() => { setPlaying(true); frameRef.current?.focus(); }, []);
  return <section className="playerPage" tabIndex="-1">
    <div className="playerTop"><button className="back" onClick={onClose}>← Back</button><div><span className="liveDot" /> Playing <strong>{player.item.title || player.item.name}</strong></div><button className="playerHint" onClick={()=>frameRef.current?.focus()}>🎮 Focus Player</button></div>
    <div className="playerFrameWrap"><iframe ref={frameRef} title="VidKing Player" src={player.url} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen onLoad={()=>setPlaying(true)} /></div>
    <div className="playerMeta"><div><p className="eyebrow">NOW PLAYING</p><h2>{player.item.title || player.item.name}</h2><p>Playback stays inside the application. Use the controller/keyboard to move focus and the player controls.</p></div><span className={playing ? 'status ok' : 'status'}>{playing ? '● Player loaded' : 'Loading player…'}</span></div>
  </section>;
}

export default App;
