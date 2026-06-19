import React, { createContext, useContext, useState } from 'react';

const PROXIMITY_TEST_KEY = 'reign_proximity_test_enabled';

interface GeofenceTestContextType {
  proximityTestEnabled: boolean;
  setProximityTestEnabled: (enabled: boolean) => void;
}

const GeofenceTestContext = createContext<GeofenceTestContextType | null>(null);

export const GeofenceTestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proximityTestEnabled, setProximityTestEnabledState] = useState(
    () => localStorage.getItem(PROXIMITY_TEST_KEY) === 'true'
  );

  const setProximityTestEnabled = (enabled: boolean) => {
    setProximityTestEnabledState(enabled);
    if (enabled) {
      localStorage.setItem(PROXIMITY_TEST_KEY, 'true');
    } else {
      localStorage.removeItem(PROXIMITY_TEST_KEY);
    }
  };

  return (
    <GeofenceTestContext.Provider value={{ proximityTestEnabled, setProximityTestEnabled }}>
      {children}
    </GeofenceTestContext.Provider>
  );
};

export const useGeofenceTest = () => {
  const ctx = useContext(GeofenceTestContext);
  if (!ctx) throw new Error('useGeofenceTest must be used within GeofenceTestProvider');
  return ctx;
};
