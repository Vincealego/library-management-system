import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { coverColor, initials } from '../components/BookCard.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'notfound' | 'error' | 'success'

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    fetch(`${API_URL}/books/${id}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404 || res.status === 400) {
          setStatus('notfound');
          return null;
        }
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        setBook(json);
        setStatus('success');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
  }, [id]);

  return (
    <div className="detail">
      <Link to="/" className="back-link">
        &larr; Back to catalog
      </Link>

      {status === 'loading' && (
        <div className="detail__card skeleton" aria-busy="true" aria-label="Loading book">
          <div className="detail__cover skeleton__block" />
          <div className="detail__info">
            <div className="skeleton__line skeleton__line--title" />
            <div className="skeleton__line" />
            <div className="skeleton__line skeleton__line--short" />
          </div>
        </div>
      )}

      {status === 'notfound' && (
        <div className="state-box">
          <h2>Book not found</h2>
          <p>There is no book with id {id}.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="state-box state-box--error" role="alert">
          <h2>Could not load this book</h2>
          <p>Check that the API is running at {API_URL}.</p>
        </div>
      )}

      {status === 'success' && book && (
        <article className="detail__card">
          <div className="detail__cover" style={{ background: coverColor(book.genreId) }}>
            <span>{initials(book.title)}</span>
          </div>
          <div className="detail__info">
            <h1>{book.title}</h1>
            <p className="detail__author">by {book.author}</p>
            {book.genre && <span className="badge">{book.genre.name}</span>}

            <dl className="detail__facts">
              <div>
                <dt>ISBN</dt>
                <dd>{book.isbn}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>{book.publishedYear ?? 'Unknown'}</dd>
              </div>
              <div>
                <dt>Copies in library</dt>
                <dd>{book.totalCopies}</dd>
              </div>
              <div>
                <dt>Genre</dt>
                <dd>{book.genre ? book.genre.name : 'Uncategorised'}</dd>
              </div>
            </dl>
          </div>
        </article>
      )}
    </div>
  );
}
