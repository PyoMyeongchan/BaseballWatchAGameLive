import { TEAM_COLORS } from '@/constants/kbo';
import { Colors } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const mode = scheme === 'unspecified' ? 'light' : scheme;
  const { myTeam } = useSettings();

  const base = Colors[mode];
  const teamAccent = myTeam ? TEAM_COLORS[myTeam]?.[mode] : null;

  if (teamAccent) {
    return { ...base, accent: teamAccent };
  }
  return base;
}
