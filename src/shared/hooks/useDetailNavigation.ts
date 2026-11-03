import { useLocation, useNavigate } from 'react-router';
import { activeMenuKey, backTarget, navigationClassId, SECTION_PATHS, type NavigationContext } from '../utils/navigation';

export function useDetailNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const context = location.state as NavigationContext | null;
  const menuKey = activeMenuKey(location.pathname, SECTION_PATHS, context?.menuKey);
  const classId = navigationClassId(location.pathname, context);
  return {
    classId,
    navigationState: location.state,
    openDetail: (to: string) => navigate(to, { state: {
      from: `${location.pathname}${location.search}`, menuKey, classId,
    } satisfies NavigationContext }),
    goBack: () => {
      const target = backTarget(window.history.state?.idx, location.pathname, context?.from);
      if (typeof target === 'number') navigate(target);
      else navigate(target, { replace: true });
    },
  };
}
