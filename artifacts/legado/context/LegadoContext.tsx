import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PROFILE_STORAGE_KEY = '@legado/profile';

export type LegadoProfile = {
  name: string;
  photoUri?: string;
  createdAt: string;
};

type LegadoContextValue = {
  profile: LegadoProfile | null;
  isHydrating: boolean;
  saveProfile: (profile: LegadoProfile) => Promise<void>;
  updateProfile: (profile: LegadoProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
};

const LegadoContext = createContext<LegadoContextValue | null>(null);

export function LegadoProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LegadoProfile | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(PROFILE_STORAGE_KEY)
      .then((storedProfile) => {
        if (!isMounted) return;
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile) as LegadoProfile);
        }
      })
      .catch(() => {
        if (isMounted) setProfile(null);
      })
      .finally(() => {
        if (isMounted) setIsHydrating(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const persistProfile = async (nextProfile: LegadoProfile | null) => {
    setProfile(nextProfile);
    if (nextProfile) {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    } else {
      await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  };

  const value = useMemo(
    () => ({
      profile,
      isHydrating,
      saveProfile: (nextProfile: LegadoProfile) => persistProfile(nextProfile),
      updateProfile: (nextProfile: LegadoProfile) => persistProfile(nextProfile),
      clearProfile: () => persistProfile(null),
    }),
    [isHydrating, profile],
  );

  return <LegadoContext.Provider value={value}>{children}</LegadoContext.Provider>;
}

export function useLegado() {
  const context = useContext(LegadoContext);
  if (!context) {
    throw new Error('useLegado must be used inside LegadoProvider');
  }
  return context;
}