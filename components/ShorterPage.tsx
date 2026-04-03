
// app/page.tsx
'use client';

import { useState } from 'react';

type Short = {
  id: string;
  title: string;
  thumbnail: string;
  views: string;
};

export default function ShorterPage() {
  const [query, setQuery] = useState('');
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(false);

  const searchShorts = async () => {
    setLoading(true);
    const res = await fetch(`/api/shorter?q=${query}`);
    const data = await res.json();
    setShorts(data);
    setLoading(false);
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>YouTube Shorts Finder</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search channel..."
        style={{ padding: 8, width: 300 }}
      />

      <button onClick={searchShorts} style={{ marginLeft: 10 }}>
        Search
      </button>

      {loading && <p>Loading...</p>}

      <div style={{ marginTop: 20 }}>
        {shorts.map((short) => (
          <div key={short.id} style={{ marginBottom: 20 }}>
            <img src={short.thumbnail} width={200} />
            <p>{short.title}</p>
            <small>{short.views}</small>
          </div>
        ))}
      </div>
    </main>
  );
}
