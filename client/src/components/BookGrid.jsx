import { useEffect, useMemo, useState } from 'react';
import BookCard from './BookCard.jsx';
import BookCardSkeleton from './BookCardSkeleton.jsx';

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_LIMIT = 100; // the API allows at most 100 per request

export default function BookGrid({ genreId, search, sortBy = 'title', onClearFilters }) {
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'success'
  const [attempt, setAttempt] = useState(0);

  // Re-fetch whenever a filter changes (or the user presses Retry).
  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (genreId) params.set('genreId', genreId);
    if (search) params.set('search', search);

    setStatus('loading');

    fetch(`${API_URL}/books?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setBooks(json.data);
        setTotal(json.meta.total);
        setStatus('success');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // a newer request replaced this one
        setStatus('error');
      });

    // Cancels the in-flight request so a slow old response can never overwrite a newer one.
    return () => controller.abort();
  }, [genreId, search, attempt]);

  const sortedBooks = useMemo(
    () => [...books].sort((a, b) => a[sortBy].localeCompare(b[sortBy])),
    [books, sortBy],
  );

  if (status === 'loading') {
    return (
      <div className="book-grid" aria-busy="true" aria-label="Loading books">
        {Array.from({ length: 8 }, (_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="state-box state-box--error" role="alert">
        <h2>Could not load books</h2>
        <p>Check that the API is running at {API_URL}, then try again.</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  }

  if (sortedBooks.length === 0) {
    return (
      <div className="state-box">
        <h2>No books found</h2>
        <p>Nothing matches your search or genre filter.</p>
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="result-count" aria-live="polite">
        Showing {sortedBooks.length} of {total} {total === 1 ? 'book' : 'books'}
      </p>
      <div className="book-grid">
        {sortedBooks.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </>
  );
}
