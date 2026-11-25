import { useLocation, useSearchParams } from 'react-router';

const pageSizes = [10, 20, 50, 100];
export const positiveListNumber = (text: string | null) => {
  const value = Number(text);
  return Number.isInteger(value) && value > 0 && value <= 2147483647 ? value : undefined;
};

// Keep list state in the URL; preserve unrelated deep-link parameters.
export function useListLocation(defaults: Record<string, string> = {}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const page = positiveListNumber(params.get('page')) || 1;
  const size = Number(params.get('page_size'));
  const pageSize = pageSizes.includes(size) ? size : 10;
  const choice = (key: string, allowed: string[]) => {
    const value = params.get(key) || defaults[key];
    return allowed.includes(value) ? value : defaults[key];
  };
  const update = (patch: Record<string, string | number | null | undefined>, resetPage = true, replace = false) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (resetPage) next.delete('page');
      for (const [key, value] of Object.entries(patch)) {
        const text = value == null ? '' : String(value);
        const fallback = key === 'page' ? '1' : key === 'page_size' ? '10' : defaults[key] || '';
        if (!text || text === fallback) next.delete(key); else next.set(key, text);
      }
      return next;
    }, { replace, state: location.state });
  };
  return { params, page, pageSize, choice, update,
    setPage: (next: number, size = pageSize) => update({ page: next, page_size: size }, false) };
}
