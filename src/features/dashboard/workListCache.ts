import type { DashboardWork } from '../../services/api/dashboard.service';

// One cache instance per Dashboard login/refresh; never persist personal work lists.
export function createWorkListCache(load: (category: string) => Promise<DashboardWork>) {
  const lists = new Map<string, Promise<DashboardWork>>();
  return (category: string) => {
    let result = lists.get(category);
    if (!result) {
      result = load(category).catch(error => { lists.delete(category); throw error; });
      lists.set(category, result);
    }
    return result;
  };
}
