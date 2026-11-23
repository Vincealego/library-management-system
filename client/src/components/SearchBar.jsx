import { useEffect, useState } from 'react';

export default function SearchBar({ onSearch, delay = 400 }) {
  const [value, setValue] = useState('');

  // Debounce: wait until the user pauses typing before calling onSearch.
  // The cleanup cancels the previous timer on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value.trim());
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, onSearch]);

  return (
    <label className="control control--grow">
      <span>Search</span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by title or author"
      />
    </label>
  );
}
