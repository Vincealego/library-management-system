import { Link } from 'react-router-dom';

const COVER_COLORS = ['#2f6f73', '#8a4f7d', '#b5651d', '#3e5c9a', '#5b7f3a', '#9a3b3b'];

export function coverColor(genreId) {
  return COVER_COLORS[Math.abs(Number(genreId) || 0) % COVER_COLORS.length];
}

export function initials(title = '') {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

export default function BookCard({ book }) {
  return (
    <article className="book-card">
      <Link to={`/books/${book.id}`} className="book-card__link">
        <div className="book-cover" style={{ background: coverColor(book.genreId) }}>
          <span>{initials(book.title)}</span>
        </div>
        <div className="book-card__body">
          <h3>{book.title}</h3>
          <p className="muted">{book.author}</p>
          <div className="book-card__meta">
            {book.genre && <span className="badge">{book.genre.name}</span>}
            <span className="muted small">
              {book.totalCopies} {book.totalCopies === 1 ? 'copy' : 'copies'}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
