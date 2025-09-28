import type { Session } from '@supabase/supabase-js';

export type { Session };

export interface VocabRowStats {
  Passed1: number;
  Passed2: number;
  Failed: number;
  TotalAttempt: number;
  SuccessRate: number;
  FailureRate: number;
  RankPoint: number;
  Level: number;
  InQueue: number;
  QuitQueue: boolean;
  LastPracticeDate: string | null;
  flashcardStatus: 'None' | 'Hard' | 'Good' | 'Easy';
}

export interface VocabRow {
  id: string;
  tableId: string;
  keyword: string;
  data: Record<string, string>;
  tags: string[];
  stats: VocabRowStats;
}

export interface ColumnDef {
  name: string;
  type: 'text' | 'image';
}

export interface VocabTable {
  id: string;
  name: string;
  columns: ColumnDef[];
  rows: VocabRow[];
}

export enum StudyMode {
  MCQ = "MCQ",
  TF = "TF",
  Typing = "Typing",
}

export interface Relation {
  id: string;
  tableId: string;
  name: string;
  modes: StudyMode[];
  questionCols: string[];
  answerCols: string[];
}

export interface GlobalStats {
  xp: number;
  inQueueReal: number;
  quitQueueReal: number;
}

export enum SortCriterion {
  PriorityScore = "Highest Priority Score",
  Random = "Random",
  LowestRankPoint = "Lowest Rank Point",
  LowestSuccessRate = "Lowest Success Rate",
  LongestSincePractice = "Longest Since Practice",
  PrioritizeQuitQueue = "Prioritize Quitted Words",
}

export interface StudySortLayer {
  criterion: SortCriterion;
}

export interface StudyConfig {
  tableIds: string[];
  modes: StudyMode[];
  relationIds: string[];
  useRandomRelation: boolean;
  sortLayers: StudySortLayer[];
  wordCount: number;
  words: VocabRow[];
}

export interface StudySession {
  id: string;
  createdAt: string;
  status: 'completed' | 'quit';
  tableIds: string[];
  tableNames: string[];
  modes: StudyMode[];
  wordCount: number;
}

export type WordStatus = 'untouched' | 'fail' | 'pass1' | 'pass2';

export interface WordProgress {
    status: WordStatus;
    newFails: number;
    newPasses: number;
}

export interface RewardEvent {
  id: string;
  timestamp: string;
  type: 'session_complete' | 'session_quit' | 'milestone_unlocked';
  description: string;
  xpChange: number;
}

export interface AutoBackupSettings {
  enabled: boolean;
  interval: '30m' | '2h' | '6h' | '1d' | '2d' | '7d';
  keep: number;
}

export type ConflictResolutionPolicy = 'merge' | 'overwrite_local' | 'overwrite_cloud';

export type Theme = 'light' | 'dark';

export interface VmindSettings {
  theme: Theme;
  quitPenaltyEnabled: boolean;
  autoBackup: AutoBackupSettings;
  conflictPolicy: ConflictResolutionPolicy;
}

export interface BackupRecord {
    id: string;
    timestamp: string;
    type: 'auto' | 'manual';
    format: 'json' | 'csv';
    fileRef: string; 
}