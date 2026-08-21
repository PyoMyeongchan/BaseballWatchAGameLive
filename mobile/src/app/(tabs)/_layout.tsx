import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useSettings } from '@/contexts/settings-context';

export default function TabLayout() {
  const { myTeam, loaded } = useSettings();

  if (!loaded) return null;
  if (!myTeam) return <Redirect href="/onboarding" />;

  return <AppTabs />;
}
