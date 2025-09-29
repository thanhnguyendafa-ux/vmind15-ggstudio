import { ColumnDef, VocabRow, VocabRowStats, FilterLayer, VocabTable } from './types';

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

export const getRowValue = (row: VocabRow, column: string, tableColumns: string[]): any => {
    const DEFAULT_COLUMNS = [ "Tags", "Passed1", "Passed2", "Failed", "TotalAttempt", "SuccessRate", "FailureRate", "RankPoint", "Level", "InQueue", "QuitQueue", "LastPracticeDate", "PriorityScore" ];
    if (column === 'keyword') return row.keyword;
    if (tableColumns.includes(column)) return row.data[column] || '';
    if (DEFAULT_COLUMNS.includes(column)) {
        if (column === 'Tags') return row.tags.join(', ');
        if (Object.prototype.hasOwnProperty.call(row.stats, column)) {
            return row.stats[column as keyof VocabRowStats];
        }
    }
    return '';
};

export const checkCondition = (row: VocabRow, layer: FilterLayer, table: VocabTable): boolean => {
    const { column, condition, value } = layer;
    const rowValue = getRowValue(row, column, table.columns.map(c => c.name));
    const colType = getColumnType(column, table.columns);

    if (condition === 'isEmpty') return rowValue === null || rowValue === undefined || String(rowValue).trim() === '';
    if (condition === 'isNotEmpty') return rowValue !== null && rowValue !== undefined && String(rowValue).trim() !== '';
    
    // From here, if rowValue is empty, it shouldn't match most conditions
    if (rowValue === null || rowValue === undefined || String(rowValue).trim() === '') return false;

    if (colType === 'text' || colType === 'image') {
        const strRowValue = String(rowValue).toLowerCase();
        const strValue = String(value).toLowerCase();
        if (condition === 'contains') return strRowValue.includes(strValue);
        if (condition === 'doesNotContain') return !strRowValue.includes(strValue);
        if (condition === 'equals') return strRowValue === strValue;
    } else if (colType === 'number') {
        const numRowValue = Number(rowValue);
        const numValue = Number(value);
        if (isNaN(numRowValue) || isNaN(numValue)) return false;
        if (condition === 'equals') return numRowValue === numValue;
        if (condition === 'notEquals') return numRowValue !== numValue;
        if (condition === 'greaterThan') return numRowValue > numValue;
        if (condition === 'lessThan') return numRowValue < numValue;
    } else if (colType === 'boolean') {
        const boolValue = value === 'true';
        if (condition === 'is') return !!rowValue === boolValue;
    }
    return false;
};