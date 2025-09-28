import { ColumnDef } from './types';

export const getColumnType = (columnName: string, columnDefs: ColumnDef[]): 'text' | 'image' | 'number' | 'boolean' => {
    // Check for hardcoded stat/default columns first
    if (['RankPoint', 'Level', 'SuccessRate', 'FailureRate', 'Passed1', 'Passed2', 'Failed', 'TotalAttempt', 'InQueue', 'PriorityScore'].includes(columnName)) {
        return 'number';
    }
    if (columnName === 'QuitQueue') {
        return 'boolean';
    }
    
    // Check user-defined columns
    const colDef = columnDefs.find(c => c.name === columnName);
    if (colDef) {
        return colDef.type;
    }
    
    // Default for keyword, Tags, LastPracticeDate, and any other case
    return 'text'; 
};