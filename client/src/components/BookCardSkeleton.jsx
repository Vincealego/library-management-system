// Stretch: placeholder card shown while books load, instead of a plain "Loading..." message.
export default function BookCardSkeleton() {
  return (
    <div className="book-card skeleton" aria-hidden="true">
      <div className="book-cover skeleton__block" />
      <div className="book-card__body">
        <div className="skeleton__line skeleton__line--title" />
        <div className="skeleton__line" />
        <div className="skeleton__line skeleton__line--short" />
      </div>
    </div>
  );
}
