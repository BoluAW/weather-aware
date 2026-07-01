import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { Unit, WindFormat } from '../lib/units';

interface SettingsContextValue {
  unit: Unit;
  windFormat: WindFormat;
  setUnit: (u: Unit) => void;
  setWindFormat: (w: WindFormat) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  unit: 'metric',
  windFormat: 'degrees',
  setUnit: () => {},
  setWindFormat: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<Unit>('metric');
  const [windFormat, setWindFormatState] = useState<WindFormat>('degrees');

  useEffect(() => {
    (async () => {
      const savedUnit = await AsyncStorage.getItem('pref_unit');
      const savedWind = await AsyncStorage.getItem('pref_wind_format');
      if (savedUnit) setUnitState(savedUnit as Unit);
      if (savedWind) setWindFormatState(savedWind as WindFormat);
    })();
  }, []);

  function setUnit(u: Unit) {
    setUnitState(u);
    AsyncStorage.setItem('pref_unit', u);
  }

  function setWindFormat(w: WindFormat) {
    setWindFormatState(w);
    AsyncStorage.setItem('pref_wind_format', w);
  }

  return (
    <SettingsContext.Provider value={{ unit, windFormat, setUnit, setWindFormat }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
