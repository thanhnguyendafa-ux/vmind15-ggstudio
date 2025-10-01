import { VocabTable, VocabRow, Relation, StudyMode, GlobalStats, VocabRowStats, StudyConfig, StudySession, WordProgress, ColumnDef, VmindSettings, RewardEvent, BackupRecord, StudyPreset } from '../types';
import { FIBONACCI_MILESTONES } from '../constants';
import { parseCsvLine } from '../utils';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

const USER_DATA_KEY = 'vmind-user-data';

// --- In-memory database simulation for guest/offline mode ---
let mockTables: VocabTable[];
let mockRelations: Relation[];
let mockGlobalStats: GlobalStats;
let mockStudySessions: StudySession[];
let mockSettings: VmindSettings;
let mockRewardEvents: RewardEvent[];
let mockBackupRecords: BackupRecord[];
let mockStudyPresets: StudyPreset[];

const persistState = () => {
    if (!supabase) { // Only persist to local storage if supabase is not configured
        try {
            const state = {
                tables: mockTables,
                relations: mockRelations,
                globalStats: mockGlobalStats,
                studySessions: mockStudySessions,
                settings: mockSettings,
                rewardEvents: mockRewardEvents,
                backupRecords: mockBackupRecords,
                studyPresets: mockStudyPresets
            };
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(state));
        } catch (e) {
            console.error("Failed to save user data", e);
        }
    }
};

const defaultSettings: VmindSettings = {
    theme: 'light',
    quitPenaltyEnabled: true,
    autoBackup: {
        enabled: true,
        interval: '6h',
        keep: 5,
    },
    conflictPolicy: 'merge',
};

const loadState = () => {
    try {
        const storedState = localStorage.getItem(USER_DATA_KEY);
        if (storedState) {
            const state = JSON.parse(storedState);
            mockTables = state.tables || [];
            mockRelations = state.relations || [];
            mockGlobalStats = state.globalStats || { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
            mockStudySessions = state.studySessions || [];
            mockSettings = { ...defaultSettings, ...(state.settings || {}) };
            mockRewardEvents = state.rewardEvents || [];
            mockBackupRecords = state.backupRecords || [];
            mockStudyPresets = state.studyPresets || [];
        } else {
            mockTables = [];
            mockRelations = [];
            mockGlobalStats = { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
            mockStudySessions = [];
            mockSettings = defaultSettings;
            mockRewardEvents = [];
            mockBackupRecords = [];
            mockStudyPresets = [];
        }
    } catch (e) {
        console.error("Failed to load user data", e);
        mockTables = [];
        mockRelations = [];
        mockGlobalStats = { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
        mockStudySessions = [];
        mockSettings = defaultSettings;
        mockRewardEvents = [];
        mockBackupRecords = [];
        mockStudyPresets = [];
    }
};

const recalculateStats = (stats: Partial<VocabRowStats>): VocabRowStats => {
    const passed1 = stats.Passed1 || 0;
    const passed2 = stats.Passed2 || 0;
    const failed = stats.Failed || 0;

    const totalAttempt = passed1 + passed2 + failed;
    const failureRate = totalAttempt === 0 ? 0 : failed / totalAttempt;
    const successRate = 1 - failureRate;
    const rankPoint = (passed1 + passed2) - failed;

    let level = 1;
    if (rankPoint >= 32) level = 6;
    else if (rankPoint >= 16) level = 5;
    else if (rankPoint >= 8) level = 4;
    else if (rankPoint >= 4) level = 3;
    else if (rankPoint >= 1) level = 2;

    return {
        Passed1: passed1,
        Passed2: passed2,
        Failed: failed,
        TotalAttempt: totalAttempt,
        SuccessRate: successRate,
        FailureRate: failureRate,
        RankPoint: rankPoint,
        Level: level,
        InQueue: stats.InQueue || 0,
        QuitQueue: stats.QuitQueue || false,
        LastPracticeDate: stats.LastPracticeDate || null,
        flashcardStatus: stats.flashcardStatus || 'None',
    };
};


const createNewRow = (tableId: string, keyword: string, data: Record<string, string>): VocabRow => ({
    id: crypto.randomUUID(),
    tableId,
    keyword,
    data,
    tags: [],
    stats: recalculateStats({
        Passed1: 0, Passed2: 0, Failed: 0, InQueue: 0, QuitQueue: false, LastPracticeDate: null, flashcardStatus: 'None',
    })
});


const calculatePriorityScore = (row: VocabRow, maxInQueueInTable: number): number => {
    const { RankPoint, FailureRate, Level, InQueue, QuitQueue, LastPracticeDate } = row.stats;
    
    const today = new Date();
    const lastPractice = LastPracticeDate ? new Date(LastPracticeDate) : new Date(0);
    const daysSincePractice = (today.getTime() - lastPractice.getTime()) / (1000 * 3600 * 24);

    let g_x = 0.1;
    if (daysSincePractice >= 10) g_x = 1.0;
    else if (daysSincePractice >= 5) g_x = 0.8;
    else if (daysSincePractice >= 2) g_x = 0.5;

    const h_QuitQueue = QuitQueue ? 1 : 0;
    const normalizedInQueue = maxInQueueInTable > 0 ? InQueue / maxInQueueInTable : 0;
    const rankPointComponent = 1 / (Math.max(RankPoint, -0.999) + 1);

    return 0.2 * rankPointComponent + 0.2 * FailureRate + 0.1 * (1 / (Level + 1)) + 0.2 * g_x + 0.2 * h_QuitQueue + 0.1 * (1 - normalizedInQueue);
};

export const dataService = {
  calculatePriorityScore,
  initializeLocalData: () => {
    loadState();
  },
  
  hasLocalData: (): boolean => {
    const storedState = localStorage.getItem(USER_DATA_KEY);
    if (!storedState) return false;
    try {
      const state = JSON.parse(storedState);
      return (state.tables && state.tables.length > 0) || (state.studySessions && state.studySessions.length > 0);
    } catch {
      return false;
    }
  },

  clearLocalData: () => {
    localStorage.removeItem(USER_DATA_KEY);
    loadState();
  },

  getTables: async (): Promise<VocabTable[]> => {
    if (!supabase) return mockTables;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data, error } = await supabase.from('tables').select('*, rows(*)');
        if (error) { console.error('Error fetching tables:', error); throw error; }
        return (data || []).map(table => ({...table, rows: table.rows || []}));
    } else {
        return mockTables;
    }
  },

  getRelationsForTables: async (tableIds: string[]): Promise<Relation[]> => {
    if (!supabase) return mockRelations.filter(r => tableIds.includes(r.tableId));
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        if (tableIds.length === 0) return [];
        const { data, error } = await supabase.from('relations').select('*').in('table_id', tableIds);
        if (error) { console.error('Error fetching relations:', error); throw error; }
        return data || [];
    } else {
        return mockRelations.filter(r => tableIds.includes(r.tableId));
    }
  },

  getGlobalStats: async (): Promise<GlobalStats> => {
    if (!supabase) return mockGlobalStats;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data, error } = await supabase.from('profiles').select('global_stats').single();
        if (error && error.code !== 'PGRST116') { console.error('Error fetching global stats:', error); throw error; }
        return data?.global_stats || { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
    } else {
        return mockGlobalStats;
    }
  },

  getStudySessions: async (): Promise<StudySession[]> => {
    if (!supabase) return mockStudySessions;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase.from('study_sessions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      return mockStudySessions;
    }
  },

  getSettings: async (): Promise<VmindSettings> => {
    if (!supabase) return mockSettings;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase.from('profiles').select('settings').single();
      if (error && error.code !== 'PGRST116') throw error;
      return { ...defaultSettings, ...(data?.settings || {}) };
    } else {
      return mockSettings;
    }
  },

  updateSettings: async (newSettings: Partial<VmindSettings>): Promise<VmindSettings> => {
    if (!supabase) {
        mockSettings = { ...mockSettings, ...newSettings };
        persistState();
        return mockSettings;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: currentProfile, error: fetchError } = await supabase.from('profiles').select('settings').single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        const updatedSettings = { ...defaultSettings, ...(currentProfile?.settings || {}), ...newSettings };
        const { error } = await supabase.from('profiles').upsert({ id: session.user.id, settings: updatedSettings });
        if (error) throw error;
        return updatedSettings;
    } else {
        mockSettings = { ...mockSettings, ...newSettings };
        persistState();
        return mockSettings;
    }
  },

  getRewardEvents: async (): Promise<RewardEvent[]> => {
    if (!supabase) return mockRewardEvents;
    const { data: { session } } = await supabase.auth.getSession();
    if(session) {
        const {data, error} = await supabase.from('reward_events').select('*').order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
    } else {
        return mockRewardEvents;
    }
  },
  
  getStudyPresets: async (): Promise<StudyPreset[]> => {
      if (!supabase) return mockStudyPresets;
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          const {data, error} = await supabase.from('study_presets').select('*');
          if (error) throw error;
          return data || [];
      } else {
          return mockStudyPresets;
      }
  },

  saveStudyPreset: async (preset: Omit<StudyPreset, 'id'>): Promise<StudyPreset> => {
    const newPreset = { ...preset, id: crypto.randomUUID() };
    if (!supabase) {
      mockStudyPresets.push(newPreset);
      persistState();
      return newPreset;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data, error } = await supabase.from('study_presets').insert({ ...newPreset, user_id: session.user.id }).select().single();
        if (error) throw error;
        return data;
    } else {
       mockStudyPresets.push(newPreset);
       persistState();
       return newPreset;
    }
  },

  deleteStudyPreset: async (presetId: string): Promise<void> => {
    if (!supabase) {
      mockStudyPresets = mockStudyPresets.filter(p => p.id !== presetId);
      persistState();
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase.from('study_presets').delete().match({ id: presetId, user_id: session.user.id });
      if (error) throw error;
    } else {
      mockStudyPresets = mockStudyPresets.filter(p => p.id !== presetId);
      persistState();
    }
  },

  createTable: async (name: string, columns: ColumnDef[]): Promise<VocabTable> => {
    const newTable = { id: crypto.randomUUID(), name, columns, rows: [] };
    if (!supabase) {
        mockTables.push(newTable);
        persistState();
        return newTable;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { rows, ...tableToInsert } = newTable;
        const { data, error } = await supabase.from('tables').insert({ ...tableToInsert, user_id: session.user.id }).select().single();
        if (error) throw error;
        return { ...data, rows: [] };
    } else {
        mockTables.push(newTable);
        persistState();
        return newTable;
    }
  },

  addWord: async (tableId: string, keyword: string, data: Record<string, string>): Promise<VocabRow> => {
      const newRow = createNewRow(tableId, keyword, data);
      if (!supabase) {
          const table = mockTables.find(t => t.id === tableId);
          if (!table) throw new Error("Table not found");
          if (table.rows.some(r => r.keyword.toLowerCase() === keyword.toLowerCase())) throw new Error("Keyword exists");
          table.rows.push(newRow);
          persistState();
          return newRow;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
          const { data: dbRow, error } = await supabase.from('rows').insert({ ...newRow, user_id: session.user.id }).select().single();
          if (error) throw error;
          return dbRow;
      } else {
          const table = mockTables.find(t => t.id === tableId);
          if (!table) throw new Error(`Table with id ${tableId} not found.`);
          const keywordExists = table.rows.some(row => row.keyword.toLowerCase() === keyword.toLowerCase());
          if (keywordExists) throw new Error(`The keyword "${keyword}" already exists in this table.`);
          table.rows.push(newRow);
          persistState();
          return newRow;
      }
  },

  renameTable: async (tableId: string, newName: string): Promise<VocabTable> => {
    if (!supabase) {
        const table = mockTables.find(t=>t.id === tableId);
        if(!table) throw new Error("Table not found");
        table.name = newName;
        persistState();
        return table;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const {data, error} = await supabase.from('tables').update({name: newName}).match({id: tableId, user_id: session.user.id}).select().single();
        if(error) throw error;
        return data;
    } else {
        const table = mockTables.find(t=>t.id === tableId);
        if(!table) throw new Error("Table not found");
        table.name = newName;
        persistState();
        return table;
    }
  },

  deleteTable: async (tableId: string): Promise<void> => {
    if (!supabase) {
        mockTables = mockTables.filter(t => t.id !== tableId);
        mockRelations = mockRelations.filter(r => r.tableId !== tableId);
        persistState();
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { error } = await supabase.from('tables').delete().match({ id: tableId, user_id: session.user.id });
        if (error) throw error;
    } else {
        mockTables = mockTables.filter(t => t.id !== tableId);
        mockRelations = mockRelations.filter(r => r.tableId !== tableId);
        persistState();
    }
  },
  
  syncLocalToSupabase: async(user: User): Promise<void> => {
    if(!supabase) return;
    
    loadState();
    
    await supabase.from('profiles').upsert({ id: user.id, global_stats: mockGlobalStats, settings: mockSettings });

    if (mockTables.length > 0) {
        const tablesToInsert = mockTables.map(({ rows, ...table }) => ({ ...table, user_id: user.id }));
        const { error: tableError } = await supabase.from('tables').insert(tablesToInsert);
        if(tableError) throw tableError;
    }

    const rowsToInsert = mockTables.flatMap(t => t.rows).map(row => ({ ...row, user_id: user.id }));
    if(rowsToInsert.length > 0) {
        const { error: rowError } = await supabase.from('rows').insert(rowsToInsert);
        if(rowError) throw rowError;
    }
    
    const relationsToInsert = mockRelations.map(rel => ({...rel, user_id: user.id}));
    if(relationsToInsert.length > 0) {
       const { error: relError } = await supabase.from('relations').insert(relationsToInsert);
       if(relError) throw relError;
    }

    const presetsToInsert = mockStudyPresets.map(p => ({...p, user_id: user.id}));
     if(presetsToInsert.length > 0) {
       const { error: pError } = await supabase.from('study_presets').insert(presetsToInsert);
       if(pError) throw pError;
    }

     const sessionsToInsert = mockStudySessions.map(s => ({...s, user_id: user.id}));
     if(sessionsToInsert.length > 0) {
       const { error: sError } = await supabase.from('study_sessions').insert(sessionsToInsert);
       if(sError) throw sError;
    }

     const rewardsToInsert = mockRewardEvents.map(r => ({...r, user_id: user.id, timestamp: r.timestamp}));
     if(rewardsToInsert.length > 0) {
       const { error: rError } = await supabase.from('reward_events').insert(rewardsToInsert);
       if(rError) throw rError;
    }
    
    dataService.clearLocalData();
  },

  getRelationsForTable: async (tableId: string): Promise<Relation[]> => {
    if (!supabase) return mockRelations.filter(r => r.tableId === tableId);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase.from('relations').select('*').eq('table_id', tableId);
      if (error) throw error;
      return data || [];
    } else {
      return mockRelations.filter(r => r.tableId === tableId);
    }
  },

  getBackupHistory: async (): Promise<BackupRecord[]> => {
    // Backup history is a local-only concept for now
    return [...mockBackupRecords].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  triggerManualBackup: async (format: 'json' | 'csv'): Promise<void> => {
    const newBackup: BackupRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'manual',
        format,
        fileRef: `vmind_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`,
    };
    mockBackupRecords.push(newBackup);
    persistState();
   },

  getAllDataForBackup: async (): Promise<object> => {
    return {
      tables: mockTables,
      relations: mockRelations,
      globalStats: mockGlobalStats,
      studySessions: mockStudySessions,
      settings: mockSettings,
      rewardEvents: mockRewardEvents,
      backupRecords: mockBackupRecords,
      studyPresets: mockStudyPresets,
    };
  },

  restoreDataFromJson: async (backupData: any): Promise<void> => {
    if (backupData && backupData.tables) {
        mockTables = backupData.tables || [];
        mockRelations = backupData.relations || [];
        mockGlobalStats = backupData.globalStats || { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
        mockStudySessions = backupData.studySessions || [];
        mockSettings = { ...defaultSettings, ...(backupData.settings || {}) };
        mockRewardEvents = backupData.rewardEvents || [];
        mockBackupRecords = backupData.backupRecords || [];
        mockStudyPresets = backupData.studyPresets || [];
        persistState();
    } else {
        throw new Error("Invalid backup file format.");
    }
  },

  saveStudySession: async function(sessionData: Omit<StudySession, 'id' | 'createdAt'>): Promise<void> {
    const newSession: StudySession = {
        ...sessionData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };
    if(!supabase) {
        mockStudySessions.unshift(newSession);
        persistState();
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await supabase.from('study_sessions').insert({...newSession, user_id: session.user.id});
    } else {
        mockStudySessions.unshift(newSession);
        persistState();
    }
  },

  updateStatsOnCompletion: async function(config: StudyConfig, sessionProgress: Record<string, WordProgress>, xpChange: number): Promise<void> {
    const sessionHandler = async (user: User | null) => {
        // Supabase Logic
        if (user && supabase) {
            const wordIds = Object.keys(sessionProgress);
            if (wordIds.length === 0) return;

            const { data: currentRows, error: fetchError } = await supabase.from('rows').select('id, stats').in('id', wordIds);
            if (fetchError) throw fetchError;

            const rowsToUpdate = currentRows.map(row => {
                const progress = sessionProgress[row.id];
                if (!progress) return null;
                const oldStats: VocabRowStats = row.stats;
                const newStatsPartial: Partial<VocabRowStats> = {
                    ...oldStats,
                    Passed1: oldStats.Passed1 + (progress.newPasses > 1 ? progress.newPasses - 1 : 0),
                    Passed2: oldStats.Passed2 + 1,
                    Failed: oldStats.Failed + progress.newFails,
                };
                const recalculated = recalculateStats(newStatsPartial);
                recalculated.InQueue = (oldStats.InQueue || 0) + 1;
                recalculated.LastPracticeDate = new Date().toISOString();
                recalculated.QuitQueue = false;
                return { id: row.id, stats: recalculated, user_id: user.id };
            }).filter(Boolean);

            if (rowsToUpdate.length > 0) {
              const { error: upsertError } = await supabase.from('rows').upsert(rowsToUpdate);
              if (upsertError) throw upsertError;
            }

            const { data: profile, error: profileError } = await supabase.from('profiles').select('global_stats').single();
            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            const currentStats = profile?.global_stats || { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
            const updatedStats = { ...currentStats, xp: currentStats.xp + xpChange, inQueueReal: (currentStats.inQueueReal || 0) + 1 };
            await supabase.from('profiles').upsert({ id: user.id, global_stats: updatedStats });

            const tableData = await supabase.from('tables').select('name').in('id', config.tableIds);
            const tableNames = tableData.data?.map(t => t.name) || [];

            const newSession = {
                id: crypto.randomUUID(), created_at: new Date().toISOString(), status: 'completed', table_ids: config.tableIds,
                table_names: tableNames, modes: config.modes, word_count: config.words.length, user_id: user.id
            };
            const newRewardEvent = {
                id: crypto.randomUUID(), timestamp: new Date().toISOString(), type: 'session_complete',
                description: `Completed a session with ${config.words.length} words.`, xp_change: xpChange, user_id: user.id
            };

            await Promise.all([
                supabase.from('study_sessions').insert(newSession),
                supabase.from('reward_events').insert(newRewardEvent)
            ]);
        } 
        // Local Logic
        else {
            Object.keys(sessionProgress).forEach(wordId => {
                const table = mockTables.find(t => t.rows.some(r => r.id === wordId));
                if (!table) return;
                const word = table.rows.find(r => r.id === wordId);
                if (!word) return;
                const progress = sessionProgress[wordId];
                const newStatsPartial: Partial<VocabRowStats> = {
                    ...word.stats,
                    Passed1: word.stats.Passed1 + (progress.newPasses > 1 ? progress.newPasses - 1 : 0),
                    Passed2: word.stats.Passed2 + 1,
                    Failed: word.stats.Failed + progress.newFails,
                };
                word.stats = recalculateStats(newStatsPartial);
                word.stats.InQueue += 1;
                word.stats.LastPracticeDate = new Date().toISOString();
                word.stats.QuitQueue = false;
            });
            mockGlobalStats.xp += xpChange;
            mockGlobalStats.inQueueReal += 1;
            mockStudySessions.unshift({
                id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'completed', tableIds: config.tableIds,
                tableNames: mockTables.filter(t => config.tableIds.includes(t.id)).map(t => t.name), modes: config.modes, wordCount: config.words.length
            });
            mockRewardEvents.unshift({
                id: crypto.randomUUID(), timestamp: new Date().toISOString(), type: 'session_complete',
                description: `Completed a session with ${config.words.length} words.`, xpChange: xpChange
            });
            persistState();
        }
    };
    
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        await sessionHandler(session?.user ?? null);
    } else {
        await sessionHandler(null);
    }
  },

  updateStatsOnQuit: async function(config: StudyConfig, wordProgress: Record<string, WordProgress>, xpChange: number): Promise<void> {
    const sessionHandler = async (user: User | null) => {
        const quitWordIds = config.words.filter(w => wordProgress[w.id]?.status !== 'pass2').map(w => w.id);
        
        // Supabase Logic
        if (user && supabase) {
            if (quitWordIds.length > 0) {
                const { data: rowsToUpdate, error: fetchError } = await supabase.from('rows').select('id, stats').in('id', quitWordIds);
                if (fetchError) throw fetchError;

                const updatedRows = rowsToUpdate.map(row => ({ id: row.id, stats: { ...row.stats, QuitQueue: true }, user_id: user.id }));
                if (updatedRows.length > 0) {
                  const { error: upsertError } = await supabase.from('rows').upsert(updatedRows);
                  if (upsertError) throw upsertError;
                }
            }

            const { data: profile, error: profileError } = await supabase.from('profiles').select('global_stats').single();
            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            const currentStats = profile?.global_stats || { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
            const updatedStats = { ...currentStats, xp: currentStats.xp + xpChange, quitQueueReal: (currentStats.quitQueueReal || 0) + 1 };
            await supabase.from('profiles').upsert({ id: user.id, global_stats: updatedStats });

            const tableData = await supabase.from('tables').select('name').in('id', config.tableIds);
            const tableNames = tableData.data?.map(t => t.name) || [];

            const newSession = {
                id: crypto.randomUUID(), created_at: new Date().toISOString(), status: 'quit', table_ids: config.tableIds,
                table_names: tableNames, modes: config.modes, word_count: config.words.length, user_id: user.id
            };
            const newRewardEvent = {
                id: crypto.randomUUID(), timestamp: new Date().toISOString(), type: 'session_quit',
                description: `Quit a session with ${config.words.length} words.`, xp_change: xpChange, user_id: user.id
            };
            await Promise.all([
                supabase.from('study_sessions').insert(newSession),
                supabase.from('reward_events').insert(newRewardEvent)
            ]);
        }
        // Local Logic
        else {
            quitWordIds.forEach(wordId => {
                const table = mockTables.find(t => t.rows.some(r => r.id === wordId));
                const row = table?.rows.find(r => r.id === wordId);
                if (row) row.stats.QuitQueue = true;
            });

            mockGlobalStats.xp += xpChange;
            mockGlobalStats.quitQueueReal += 1;
            mockStudySessions.unshift({
                id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'quit', tableIds: config.tableIds,
                tableNames: mockTables.filter(t => config.tableIds.includes(t.id)).map(t => t.name), modes: config.modes, wordCount: config.words.length
            });
            mockRewardEvents.unshift({
                id: crypto.randomUUID(), timestamp: new Date().toISOString(), type: 'session_quit',
                description: `Quit a session with ${config.words.length} words.`, xpChange: xpChange
            });
            persistState();
        }
    };
    
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        await sessionHandler(session?.user ?? null);
    } else {
        await sessionHandler(null);
    }
  },

  deleteWord: async (tableId: string, wordId: string): Promise<void> => {
      if (!supabase) {
        const table = mockTables.find(t => t.id === tableId);
        if(table) {
          table.rows = table.rows.filter(r => r.id !== wordId);
          persistState();
        }
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('rows').delete().match({ id: wordId, user_id: session.user.id });
      } else {
        const table = mockTables.find(t => t.id === tableId);
        if(table) {
          table.rows = table.rows.filter(r => r.id !== wordId);
          persistState();
        }
      }
  },
  
  addColumn: async (tableId: string, newColumn: ColumnDef): Promise<void> => {
    if (!supabase) {
        const table = mockTables.find(t => t.id === tableId);
        if(table) {
            if(table.columns.some(c => c.name.toLowerCase() === newColumn.name.toLowerCase())) {
                throw new Error(`Column "${newColumn.name}" already exists.`);
            }
            table.columns.push(newColumn);
            persistState();
        }
    } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: table, error: fetchError } = await supabase.from('tables').select('columns').eq('id', tableId).single();
            if (fetchError) throw fetchError;
            if (table) {
                const updatedColumns = [...table.columns, newColumn];
                await supabase.from('tables').update({ columns: updatedColumns }).eq('id', tableId);
            }
        } else {
            // local logic as above
            const table = mockTables.find(t => t.id === tableId);
            if(table) {
                if(table.columns.some(c => c.name.toLowerCase() === newColumn.name.toLowerCase())) {
                    throw new Error(`Column "${newColumn.name}" already exists.`);
                }
                table.columns.push(newColumn);
                persistState();
            }
        }
    }
  },
  
  removeColumn: async (tableId: string, columnName: string): Promise<void> => {
    // Simplified: does not remove data from rows for performance.
    if (!supabase) {
        const table = mockTables.find(t => t.id === tableId);
        if(table) {
            table.columns = table.columns.filter(c => c.name !== columnName);
            persistState();
        }
    } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: table, error: fetchError } = await supabase.from('tables').select('columns').eq('id', tableId).single();
            if (fetchError) throw fetchError;
            if (table) {
                const updatedColumns = table.columns.filter((c: ColumnDef) => c.name !== columnName);
                await supabase.from('tables').update({ columns: updatedColumns }).eq('id', tableId);
            }
        } else {
            const table = mockTables.find(t => t.id === tableId);
            if(table) {
                table.columns = table.columns.filter(c => c.name !== columnName);
                persistState();
            }
        }
    }
  },
  
  renameColumn: async (tableId: string, oldName: string, newName: string): Promise<void> => {
    // Simplified: does not migrate data in rows for performance.
    if (!supabase) {
        const table = mockTables.find(t => t.id === tableId);
        if(table) {
            const col = table.columns.find(c => c.name === oldName);
            if(col) col.name = newName;
            persistState();
        }
    } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
             const { data: table, error: fetchError } = await supabase.from('tables').select('columns').eq('id', tableId).single();
             if (fetchError) throw fetchError;
             if (table) {
                const updatedColumns = table.columns.map((c: ColumnDef) => c.name === oldName ? {...c, name: newName} : c);
                await supabase.from('tables').update({ columns: updatedColumns }).eq('id', tableId);
             }
        } else {
             const table = mockTables.find(t => t.id === tableId);
             if(table) {
                const col = table.columns.find(c => c.name === oldName);
                if(col) col.name = newName;
                persistState();
            }
        }
    }
  },

  importData: async (tableId: string, rowsToImport: Array<Record<string, string>>, strategy: 'merge' | 'overwrite' | 'addNewOnly'): Promise<void> => {
    // This is a complex function. For now, it will only support local mode.
    const table = mockTables.find(t => t.id === tableId);
    if (!table) throw new Error("Table not found");

    const existingRows = new Map(table.rows.map(row => [row.keyword.toLowerCase(), row]));

    rowsToImport.forEach(importRow => {
        const keyword = importRow.keyword?.trim();
        if (!keyword) return;

        const existingRow = existingRows.get(keyword.toLowerCase());
        
        if (existingRow) {
            if (strategy === 'addNewOnly') return;
            Object.keys(importRow).forEach(key => {
                if (key !== 'keyword' && table.columns.some(c => c.name === key)) {
                     if (strategy === 'overwrite' || (strategy === 'merge' && importRow[key].trim() !== '')) {
                         existingRow.data[key] = importRow[key];
                     }
                }
            });
        } else {
            const { keyword: kw, ...data } = importRow;
            const dataForTable: Record<string, string> = {};
            table.columns.forEach(c => {
                dataForTable[c.name] = data[c.name] || '';
            });
            const newRow = createNewRow(tableId, keyword, dataForTable);
            table.rows.push(newRow);
        }
    });
    persistState();
  },

  resetWordStats: async (tableId: string, wordId: string): Promise<void> => {
    const newStats = recalculateStats({
        Passed1: 0, Passed2: 0, Failed: 0, InQueue: 0, QuitQueue: false, LastPracticeDate: null, flashcardStatus: 'None'
    });
    if (!supabase) {
        const table = mockTables.find(t => t.id === tableId);
        if (table) {
            const row = table.rows.find(r => r.id === wordId);
            if (row) { row.stats = newStats; persistState(); }
        }
    } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase.from('rows').update({ stats: newStats }).match({ id: wordId, user_id: session.user.id });
        } else {
            const table = mockTables.find(t => t.id === tableId);
            if (table) {
                const row = table.rows.find(r => r.id === wordId);
                if (row) { row.stats = newStats; persistState(); }
            }
        }
    }
  },

  bulkTagWords: async (tableId: string, wordIds: string[], tags: string[]): Promise<void> => {
    // This is a complex function. For now, it will only support local mode.
    const table = mockTables.find(t => t.id === tableId);
    if(table) {
        wordIds.forEach(wordId => {
            const row = table.rows.find(r => r.id === wordId);
            if(row) {
                const newTags = new Set([...row.tags, ...tags]);
                row.tags = Array.from(newTags);
            }
        });
        persistState();
    }
  },

  updateFlashcardStatus: async (tableId: string, wordId: string, status: VocabRowStats['flashcardStatus']): Promise<void> => {
     if (!supabase) {
        const table = mockTables.find(t => t.id === tableId);
        if (table) {
            const row = table.rows.find(r => r.id === wordId);
            if (row) { row.stats.flashcardStatus = status; persistState(); }
        }
     } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
             const { data: row, error } = await supabase.from('rows').select('stats').match({ id: wordId, user_id: session.user.id }).single();
             if (error) throw error;
             if (row) {
                 const newStats = { ...row.stats, flashcardStatus: status };
                 await supabase.from('rows').update({ stats: newStats }).match({ id: wordId, user_id: session.user.id });
             }
        } else {
            const table = mockTables.find(t => t.id === tableId);
            if (table) {
                const row = table.rows.find(r => r.id === wordId);
                if (row) { row.stats.flashcardStatus = status; persistState(); }
            }
        }
     }
  },

  updateWord: async (tableId: string, wordId: string, newKeyword: string, newData: Record<string, string>): Promise<VocabRow> => {
    if (!supabase) {
        const table = mockTables.find(t => t.id === tableId);
        if (!table) throw new Error("Table not found");
        const wordIndex = table.rows.findIndex(r => r.id === wordId);
        if (wordIndex === -1) throw new Error("Word not found");
        const keywordExists = table.rows.some(r => r.keyword.toLowerCase() === newKeyword.toLowerCase() && r.id !== wordId);
        if(keywordExists) throw new Error("This keyword already exists in the table.");
        const updatedWord = { ...table.rows[wordIndex], keyword: newKeyword, data: newData };
        table.rows[wordIndex] = updatedWord;
        persistState();
        return updatedWord;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data, error } = await supabase.from('rows').update({ keyword: newKeyword, data: newData }).match({ id: wordId, user_id: session.user.id }).select().single();
        if (error) throw error;
        return data;
    } else {
        const table = mockTables.find(t => t.id === tableId);
        if (!table) throw new Error("Table not found");
        const wordIndex = table.rows.findIndex(r => r.id === wordId);
        if (wordIndex === -1) throw new Error("Word not found");
        const keywordExists = table.rows.some(r => r.keyword.toLowerCase() === newKeyword.toLowerCase() && r.id !== wordId);
        if(keywordExists) throw new Error("This keyword already exists in the table.");
        const updatedWord = { ...table.rows[wordIndex], keyword: newKeyword, data: newData };
        table.rows[wordIndex] = updatedWord;
        persistState();
        return updatedWord;
    }
  },
  
  createRelation: async (tableId: string, name: string, questionCols: string[], answerCols: string[], modes: StudyMode[]): Promise<Relation> => {
    const newRelation: Relation = {
        id: crypto.randomUUID(),
        tableId, name, questionCols, answerCols, modes
    };
     if (!supabase) {
        mockRelations.push(newRelation);
        persistState();
        return newRelation;
     }
     const { data: { session } } = await supabase.auth.getSession();
     if (session) {
        const { data, error } = await supabase.from('relations').insert({...newRelation, user_id: session.user.id}).select().single();
        if(error) throw error;
        return data;
     } else {
        mockRelations.push(newRelation);
        persistState();
        return newRelation;
     }
  },

  importTableFromCSV: async (csvContent: string): Promise<VocabTable> => {
    // This is a complex function. For now, it will only support local mode.
    const lines = csvContent.trim().replace(/\r/g, '').split('\n');
    if (lines.length < 1) throw new Error("CSV file is empty.");
    const headers = parseCsvLine(lines[0]);
    if (headers.findIndex(h => h.toLowerCase() === 'keyword') === -1) throw new Error("CSV must contain a 'keyword' column.");
    const knownStatColumns = new Set(["Passed1", "Passed2", "Failed", "TotalAttempt", "SuccessRate", "FailureRate", "RankPoint", "Level", "InQueue", "QuitQueue", "LastPracticeDate", "flashcardStatus"]);
    const columns: ColumnDef[] = headers
        .filter(h => h.toLowerCase() !== 'keyword' && h.toLowerCase() !== 'tags' && !knownStatColumns.has(h))
        .map(h => ({ name: h, type: 'text' }));
    const newTable: VocabTable = {
      id: crypto.randomUUID(),
      name: `Imported Table ${new Date().toLocaleTimeString()}`,
      columns,
      rows: [],
    };
    // ... rest of the logic ...
    mockTables.push(newTable);
    persistState();
    return newTable;
  },
};

loadState();