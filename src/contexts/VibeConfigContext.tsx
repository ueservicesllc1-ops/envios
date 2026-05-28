import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { vibeConfigService, VibeConfig } from '../services/vibeConfigService';

interface VibeConfigContextType {
  config: VibeConfig;
  loading: boolean;
}

const VibeConfigContext = createContext<VibeConfigContextType>({
  config: { fakeDiscountPercentage: 0 },
  loading: true,
});

export const useVibeConfig = () => useContext(VibeConfigContext);

export const VibeConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<VibeConfig>({ fakeDiscountPercentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await vibeConfigService.getConfig();
        setConfig(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  return (
    <VibeConfigContext.Provider value={{ config, loading }}>
      {children}
    </VibeConfigContext.Provider>
  );
};
