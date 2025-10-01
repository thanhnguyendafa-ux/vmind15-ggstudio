import React, { createContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { VocabTable, GlobalStats, Relation, RewardEvent, VmindSettings, StudySession, BackupRecord, Theme, Session, StudyPreset } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface DataContextType {
  tables: VocabTable[];
  globalStats: GlobalStats | null;
  relations: Relation[];
  rewardEvents: RewardEvent[];
  studySessions: StudySession[];
  studyPresets: StudyPreset[];
  settings: VmindSettings | null;
  backupHistory: BackupRecord[];
  session: Session | null;
  loading: boolean;
  isSampleDataActive: boolean;
  fetchData: () => void;
  toggleTheme: () => void;
  updateSettings: (newSettings: Partial<VmindSettings>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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
  const [studyPresets, setStudyPresets] = useState<StudyPreset[]>([]);
  const [settings, setSettings] = useState<VmindSettings | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSampleDataActive, setIsSampleDataActive] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
        const root = window.document.documentElement;
        if (settings.theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
    }
  }, [settings?.theme]);

  const clearLocalState = () => {
    setTables([]);
    setGlobalStats(null);
    setRelations([]);
    setRewardEvents([]);
    setStudySessions([]);
    setStudyPresets([]);
    setSettings(null);
    setBackupHistory([]);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tablesData = await dataService.getTables();
      const [statsData, relationsData, eventsData, settingsData, sessionsData, backupData, presetsData] = await Promise.all([
        dataService.getGlobalStats(),
        dataService.getRelationsForTables(tablesData.map(t => t.id)),
        dataService.getRewardEvents(),
        dataService.getSettings(),
        dataService.getStudySessions(),
        dataService.getBackupHistory(),
        dataService.getStudyPresets(),
      ]);
      setTables(tablesData);
      setGlobalStats(statsData);
      setRelations(relationsData);
      setRewardEvents(eventsData);
      setSettings(settingsData);
      setStudySessions(sessionsData);
      setBackupHistory(backupData);
      setStudyPresets(presetsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
      clearLocalState();
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (!supabase) {
        dataService.initializeLocalData();
        fetchData();
        setIsInitialized(true);
        return;
    };

    const handleFirstTimeSync = async (user: User) => {
        if (dataService.hasLocalData()) {
            const { count, error } = await supabase.from('tables').select('*', { count: 'exact', head: true });
            if (error) {
                console.error("Error checking for user data:", error);
                return;
            }

            if (count === 0) {
                 if (window.confirm("Welcome! You have local data on this device. Would you like to upload it to your new account? This will clear the data from this device.")) {
                    try {
                        setLoading(true);
                        await dataService.syncLocalToSupabase(user);
                        alert("Sync successful! Your local data is now in your account.");
                    } catch (syncError) {
                        console.error("Sync failed:", syncError);
                        alert("There was an error syncing your data. Please try again later.");
                    } finally {
                        setLoading(false);
                    }
                }
            }
        }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        dataService.initializeLocalData();
      }
      fetchData().then(() => setIsInitialized(true));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentSession = (await supabase.auth.getSession()).data.session;
      setSession(currentSession);
      
      if (_event === 'SIGNED_IN') {
        setLoading(true);
        clearLocalState();
        await handleFirstTimeSync(session!.user);
        await fetchData();
      }
      
      if (_event === 'SIGNED_OUT') {
        setLoading(true);
        clearLocalState();
        dataService.initializeLocalData();
        await fetchData();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
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
    alert("Sample data mode is disabled when Supabase is connected.");
  }, []);


  const contextValue = useMemo(() => ({
    tables,
    globalStats,
    relations,
    rewardEvents,
    studySessions,
    studyPresets,
    settings,
    backupHistory,
    session,
    loading: loading || !isInitialized,
    isSampleDataActive,
    fetchData,
    toggleTheme,
    updateSettings,
    signIn,
    signUp,
    signOut,
    toggleSampleData,
  }), [tables, globalStats, relations, rewardEvents, studySessions, studyPresets, settings, backupHistory, session, loading, isInitialized, isSampleDataActive, fetchData, toggleTheme, updateSettings, toggleSampleData]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};