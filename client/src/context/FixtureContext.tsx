import React, { createContext, useContext, useState, useEffect } from 'react';

interface FixtureContextType {
  useFixtures: boolean;
  setUseFixtures: (value: boolean) => void;
  toggleFixtures: () => void;
}

const FixtureContext = createContext<FixtureContextType | undefined>(undefined);

const STORAGE_KEY = 'cng_smartplan_use_fixtures';

export const FixtureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [useFixtures, setUseFixturesState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  const setUseFixtures = (val: boolean) => {
    setUseFixturesState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(val));
    }
  };

  const toggleFixtures = () => {
    setUseFixtures(!useFixtures);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(useFixtures));
    }
  }, [useFixtures]);

  return (
    <FixtureContext.Provider value={{ useFixtures, setUseFixtures, toggleFixtures }}>
      {children}
    </FixtureContext.Provider>
  );
};

export function useFixtureMode(): FixtureContextType {
  const context = useContext(FixtureContext);
  if (!context) {
    throw new Error('useFixtureMode must be used within a FixtureProvider');
  }
  return context;
}
