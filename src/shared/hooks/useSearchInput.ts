import { useEffect, useRef, useState } from 'react';

// Share one search behaviour across API lists, while keeping their URL/filter state.
export function useSearchInput(value: string, onSearch: (value: string) => void) {
  const [searchDraft, setSearchDraft] = useState(value);
  const commit = useRef(onSearch);
  commit.current = onSearch;
  useEffect(() => { setSearchDraft(value); }, [value]);
  useEffect(() => {
    const next = searchDraft.trim();
    if (next === value) return;
    const timer = setTimeout(() => commit.current(next), next ? 350 : 0);
    return () => clearTimeout(timer);
  }, [searchDraft, value]);
  const submitSearch = (text: string) => {
    setSearchDraft(text);
    if (text.trim() !== value) commit.current(text.trim());
  };
  return { searchDraft, setSearchDraft, submitSearch };
}
