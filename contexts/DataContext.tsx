
import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { VocabTable, GlobalStats, Relation } from '../types';
import { dataService } from '../services/dataService';

type Theme = 'light' | 'dark';

interface DataContextType {
  tables: VocabTable[];
  globalStats: GlobalStats | null;
  relations: Relation[];
  loading: boolean;
  fetchData: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<VocabTable[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = localStorage.getItem('vmind-theme');
      if (storedTheme) {
        return storedTheme as Theme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default for non-browser environments
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('vmind-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const tablesData = await dataService.getTables();
      const [statsData, relationsData] = await Promise.all([
        dataService.getGlobalStats(),
        dataService.getRelationsForTables(tablesData.map(t => t.id))
      ]);
      setTables(tablesData);
      setGlobalStats(statsData);
      setRelations(relationsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const contextValue = useMemo(() => ({
    tables,
    globalStats,
    relations,
    loading,
    fetchData,
    theme,
    toggleTheme,
  }), [tables, globalStats, relations, loading, theme]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};