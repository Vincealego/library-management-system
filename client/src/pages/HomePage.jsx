import { useEffect, useState } from 'react';
import BookGrid from '../components/BookGrid.jsx';
import SearchBar from '../components/SearchBar.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function HomePage() {
  // Shared filter state: BookGrid reads it, SearchBar and the controls below write it.
  const [search, setSearch] = useState('');
  const [genreId, setGenreId] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [searchResetKey, setSearchResetKey] = useState(0);

  const [genres, setGenres] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/genres`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGenres(Array.isArray(data) ? data : []))
      .catch(() => {
        // The genre filter is optional: if it cannot load, the catalog still works.
      });
    return () => controller.abort();
  }, []);

  function clearFilters() {
    setSearch('');
    setGenreId('');
    setSearchResetKey((key) => key + 1); // remounts SearchBar so its input empties too
  }

  return (
    <>
      <section className="hero">
        <h1>Find your next book</h1>
        <p>Browse the catalog, filter by genre, or search by title or author.</p>
      </section>

      <section className="toolbar" aria-label="Catalog filters">
        <SearchBar key={searchResetKey} onSearch={setSearch} />

        <label className="control">
          <span>Genre</span>
          <select value={genreId} onChange={(e) => setGenreId(e.target.value)}>
            <option value="">All genres</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <label className="control">
          <span>Sort by</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="title">Title (A to Z)</option>
            <option value="author">Author (A to Z)</option>
          </select>
        </label>
      </section>

      <BookGrid
        genreId={genreId}
        search={search}
        sortBy={sortBy}
        onClearFilters={clearFilters}
      />
    </>
  );
}
