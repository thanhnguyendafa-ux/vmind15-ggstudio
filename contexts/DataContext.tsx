import React, { createContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { VocabTable, GlobalStats, Relation, RewardEvent, VmindSettings, StudySession, BackupRecord, Theme, Session } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';

interface DataContextType {
  tables: VocabTable[];
  globalStats: GlobalStats | null;
  relations: Relation[];
  rewardEvents: RewardEvent[];
  studySessions: StudySession[];
  settings: VmindSettings | null;
  backupHistory: BackupRecord[];
  session: Session | null;
  loading: boolean;
  isSampleDataActive: boolean;
  fetchData: () => void;
  toggleTheme: () => void;
  updateSettings: (newSettings: Partial<VmindSettings>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleSampleData: (active: boolean) => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<VocabTable[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [settings, setSettings] = useState<VmindSettings | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isSampleDataActive, setIsSampleDataActive] = useState<boolean>(() => {
    try {
        return JSON.parse(localStorage.getItem('vmind-sample-mode') || 'false');
    } catch {
        return false;
    }
  });


  useEffect(() => {
    // Theme management
    if (settings) {
        const root = window.document.documentElement;
        if (settings.theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
    }
  }, [settings?.theme]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // For now, we still fetch mock data.
      // In a real implementation, this would check if the user is logged in
      // and fetch data from Supabase instead.
      const tablesData = await dataService.getTables();
      const [statsData, relationsData, eventsData, settingsData, sessionsData, backupData] = await Promise.all([
        dataService.getGlobalStats(),
        dataService.getRelationsForTables(tablesData.map(t => t.id)),
        dataService.getRewardEvents(),
        dataService.getSettings(),
        dataService.getStudySessions(),
        dataService.getBackupHistory(),
      ]);
      setTables(tablesData);
      setGlobalStats(statsData);
      setRelations(relationsData);
      setRewardEvents(eventsData);
      setSettings(settingsData);
      setStudySessions(sessionsData);
      setBackupHistory(backupData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Supabase Auth
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
        alert("Supabase is not configured. Cannot log in.");
        return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    });
    if (error) {
        console.error('Error logging in with Google:', error);
        alert('Error logging in. Check the console for details.');
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
    }
  };


  const updateSettings = useCallback(async (newSettings: Partial<VmindSettings>) => {
    const result = await dataService.updateSettings(newSettings);
    setSettings(result);
  }, []);

  const toggleTheme = useCallback(() => {
    if (settings) {
        const newTheme = settings.theme === 'light' ? 'dark' : 'light';
        updateSettings({ theme: newTheme });
    }
  }, [settings, updateSettings]);

  const toggleSampleData = useCallback(async (active: boolean) => {
    setIsSampleDataActive(active);
    localStorage.setItem('vmind-sample-mode', JSON.stringify(active));
    await dataService.setSampleMode(active);
    await fetchData();
  }, [fetchData]);


  useEffect(() => {
    const initializeApp = async () => {
        await dataService.setSampleMode(isSampleDataActive);
        await fetchData();
        setIsInitialized(true);
    };
    initializeApp();
  }, []);


  const contextValue = useMemo(() => ({
    tables,
    globalStats,
    relations,
    rewardEvents,
    studySessions,
    settings,
    backupHistory,
    session,
    loading: loading || !isInitialized,
    isSampleDataActive,
    fetchData,
    toggleTheme,
    updateSettings,
    signInWithGoogle,
    signOut,
    toggleSampleData,
  }), [tables, globalStats, relations, rewardEvents, studySessions, settings, backupHistory, session, loading, isInitialized, isSampleDataActive, fetchData, toggleTheme, updateSettings, toggleSampleData]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};