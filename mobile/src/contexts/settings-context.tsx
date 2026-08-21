import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState } from 'react';

import { getSetting, setSetting } from '@/db/settings';

type SettingsContextValue = {
  myTeam: string | null;
  loaded: boolean;
  updateMyTeam: (team: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>({
  myTeam: null,
  loaded: false,
  updateMyTeam: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting(db, 'my_team').then((value) => {
      setMyTeam(value);
      setLoaded(true);
    });
  }, [db]);

  async function updateMyTeam(team: string) {
    await setSetting(db, 'my_team', team);
    setMyTeam(team);
  }

  return (
    <SettingsContext.Provider value={{ myTeam, loaded, updateMyTeam }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
