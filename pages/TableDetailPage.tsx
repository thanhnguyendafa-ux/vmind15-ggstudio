
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { dataService } from '../services/dataService';
import { PlusIcon, MoreVerticalIcon, ImportIcon, EditIcon, TrashIcon, ColumnsIcon, XIcon, SortIcon, InfoIcon, RefreshCwIcon, TagIcon, ChevronDownIcon, ChevronUpIcon, TableIcon, LayoutGridIcon, FilterIcon } from '../components/Icons';
import { DEFAULT_COLUMNS } from '../constants';
import AddWordModal from '../components/AddWordModal';
import EditWordModal from '../components/EditWordModal';
import { VocabRow, Relation, VocabTable, VocabRowStats, ColumnDef } from '../types';
import FilterToggle, { FilterLayer } from '../components/FilterToggle';
import { getColumnType } from '../utils';
import AddColumnModal from '../components/AddColumnModal';


const WordActionsMenu: React.FC<{
    word: VocabRow;
    onEdit: (word: VocabRow) => void;
    onReset: (word: VocabRow) => void;
    onDelete: (word: VocabRow) => void;
}> = ({ word, onEdit, onReset, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(p => !p); }} 
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
            >
                <MoreVerticalIcon className="w-5 h-5" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-primary border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-10 text-sm">
                    <button onClick={() => { onEdit(word); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-secondary dark:hover:bg-slate-700">
                        <EditIcon className="w-4 h-4"/> Edit
                    </button>
                     <button onClick={() => { onReset(word); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-secondary dark:hover:bg-slate-700">
                        <RefreshCwIcon className="w-4 h-4"/> Reset Stats
                    </button>
                     <button onClick={() => { onDelete(word); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-red-500 dark:text-red-400 hover:bg-secondary dark:hover:bg-slate-700">
                        <TrashIcon className="w-4 h-4"/> Delete
                    </button>
                </div>
            )}
        </div>
    );
}

const ColumnHeaderMenu: React.FC<{
    columnName: string;
    onRename: (col: string) => void;
    onDelete: (col: string) => void;
}> = ({ columnName, onRename, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block ml-2">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                onBlur={() => setTimeout(() => setIsOpen(false), 150)} 
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-accent"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <MoreVerticalIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-primary border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-10">
                    <button onClick={() => { onRename(columnName); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-secondary dark:hover:bg-slate-700">
                        Rename
                    </button>
                    <button onClick={() => { onDelete(columnName); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-secondary dark:hover:bg-slate-700">
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

type ConflictResolutionStrategy = 'merge' | 'overwrite' | 'addNewOnly';

interface ParsedData {
    newRows: Array<Record<string, string>>;
    conflictingRows: Array<Record<string, string>>;
    headers: string[];
}

const ImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (strategy: ConflictResolutionStrategy) => void;
    data: ParsedData | null;
}> = ({ isOpen, onClose, onConfirm, data }) => {
    const [strategy, setStrategy] = useState<ConflictResolutionStrategy>('merge');

    if (!isOpen || !data) return null;

    const totalNew = data.newRows.length;
    const totalConflict = data.conflictingRows.length;

    const strategyDescriptions = {
        merge: "Update existing words with non-empty values from your file. New words will be added.",
        overwrite: "Replace existing words with the data from your file. New words will be added.",
        addNewOnly: "Skip words that already exist in your table and only add new ones.",
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold text-accent mb-4">Import CSV</h3>
                { (totalNew > 0 || totalConflict > 0) ? (
                    <>
                        <div className="bg-primary p-3 rounded-md mb-4">
                            <p><span className="font-bold text-green-500 dark:text-green-400">{totalNew}</span> new words will be added.</p>
                            <p><span className="font-bold text-yellow-500 dark:text-yellow-400">{totalConflict}</span> words already exist (conflicts).</p>
                        </div>
                        
                        <h4 className="font-semibold mb-2">How to handle conflicts?</h4>
                        <div className="space-y-2 mb-4">
                            {Object.entries(strategyDescriptions).map(([key, desc]) => (
                                <label key={key} className="flex items-start p-3 bg-primary rounded-lg cursor-pointer">
                                    <input 
                                        type="radio"
                                        name="conflict-strategy"
                                        value={key}
                                        checked={strategy === key}
                                        onChange={() => setStrategy(key as ConflictResolutionStrategy)}
                                        className="mt-1 mr-3 h-4 w-4 accent-accent"
                                    />
                                    <div>
                                        <span className="font-bold capitalize">{key.replace('addNewOnly', 'Add New Only')}</span>
                                        <p className="text-sm text-text-secondary">{desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        
                        <h4 className="font-semibold mb-2">Data Preview</h4>
                        <div className="overflow-auto border border-slate-300 dark:border-slate-600 rounded-md">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-primary dark:bg-slate-700">
                                    <tr>
                                        {data.headers.map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300 dark:divide-slate-600">
                                    {data.conflictingRows.map((row, i) => (
                                        <tr key={`conflict-${i}`} className="bg-yellow-100 dark:bg-yellow-900/30">
                                            {data.headers.map(h => <td key={h} className="p-2 truncate max-w-[150px]">{row[h]}</td>)}
                                        </tr>
                                    ))}
                                    {data.newRows.map((row, i) => (
                                        <tr key={`new-${i}`} className="bg-primary">
                                            {data.headers.map(h => <td key={h} className="p-2 truncate max-w-[150px]">{row[h]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-end space-x-4">
                            <button onClick={onClose} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg">
                                Cancel
                            </button>
                            <button onClick={() => onConfirm(strategy)} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg">
                                Import Data
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                     <p className="text-text-secondary mb-4">The selected CSV file is empty or does not contain any valid data rows.</p>
                     <div className="mt-6 flex justify-end">
                         <button onClick={onClose} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg">
                                Close
                         </button>
                     </div>
                    </>
                )}
            </div>
        </div>
    );
};

const ColumnsToggle: React.FC<{
    userColumns: string[];
    defaultColumns: string[];
    visibleColumns: Set<string>;
    onToggle: (column: string) => void;
}> = ({ userColumns, defaultColumns, visibleColumns, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);

    const renderColumnCheckbox = (col: string) => (
        <label key={col} className="flex items-center p-2 rounded-md hover:bg-slate-700 cursor-pointer">
            <input
                type="checkbox"
                checked={visibleColumns.has(col)}
                onChange={() => onToggle(col)}
                className="mr-3 h-4 w-4 rounded accent-accent"
            />
            <span className="text-sm">{col}</span>
        </label>
    );

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setIsOpen(p => !p)} 
                className="flex items-center bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <ColumnsIcon className="w-5 h-5 mr-2" /> Columns
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-primary border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-20">
                    <div className="p-2 text-sm font-semibold text-text-secondary border-b border-slate-300 dark:border-slate-600">Show/Hide Columns</div>
                    <div className="max-h-80 overflow-y-auto">
                        <div className="px-2 pt-2 pb-1 text-xs font-bold text-text-secondary uppercase tracking-wider">Custom Fields</div>
                        <div className="px-2">
                           {userColumns.map(renderColumnCheckbox)}
                        </div>
                        <div className="mt-2 px-2 pt-2 pb-1 text-xs font-bold text-text-secondary uppercase tracking-wider border-t border-slate-300 dark:border-slate-700">Statistics</div>
                        <div className="px-2 pb-2">
                          {defaultColumns.map(renderColumnCheckbox)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

type SortDirection = 'asc' | 'desc';
interface SortLayer {
    column: string;
    direction: SortDirection;
}

const SortToggle: React.FC<{
    allColumns: string[];
    sortLayers: SortLayer[];
    onSortChange: (layers: SortLayer[]) => void;
}> = ({ allColumns, sortLayers, onSortChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const handleAddLayer = () => {
        if (sortLayers.length < 3) {
            onSortChange([...sortLayers, { column: allColumns[0], direction: 'asc' }]);
        }
    };
    const handleRemoveLayer = (index: number) => {
        onSortChange(sortLayers.filter((_, i) => i !== index));
    };
    const handleLayerChange = (index: number, newLayer: Partial<SortLayer>) => {
        const newLayers = [...sortLayers];
        newLayers[index] = { ...newLayers[index], ...newLayer };
        onSortChange(newLayers);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(p => !p)}
                className="flex items-center bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200"
                aria-haspopup="true" aria-expanded={isOpen}
            >
                <SortIcon className="w-5 h-5 mr-2" /> Sort
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-primary border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-20 p-3 space-y-3">
                    {sortLayers.map((layer, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-secondary p-2 rounded-md">
                            <select
                                value={layer.column}
                                onChange={e => handleLayerChange(index, { column: e.target.value })}
                                className="flex-grow bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-300 dark:border-slate-600"
                            >
                                {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                                value={layer.direction}
                                onChange={e => handleLayerChange(index, { direction: e.target.value as SortDirection })}
                                className="bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-300 dark:border-slate-600"
                            >
                                <option value="asc">Asc</option>
                                <option value="desc">Desc</option>
                            </select>
                            <button onClick={() => handleRemoveLayer(index)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-full">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sortLayers.length < 3 && (
                        <button onClick={handleAddLayer} className="flex items-center justify-center w-full bg-secondary dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 py-2 rounded-lg text-sm">
                            <PlusIcon className="w-4 h-4 mr-2" /> Add Sort Layer
                        </button>
                    )}
                     {sortLayers.length === 0 && <p className="text-sm text-center text-text-secondary py-2">No sort criteria applied.</p>}
                </div>
            )}
        </div>
    );
};

const RelationInfoModal: React.FC<{
    relation: Relation | null;
    table: VocabTable;
    onClose: () => void;
}> = ({ relation, table, onClose }) => {
    const randomRow = useMemo(() => {
        if (!relation || table.rows.length === 0) return null;
        return table.rows[Math.floor(Math.random() * table.rows.length)];
    }, [relation, table.rows]);

    if (!relation) return null;

    const getDisplayValue = (word: VocabRow, col: string) => {
        if (col === 'keyword') return word.keyword;
        return word.data[col] || '(empty)';
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-bold text-accent">{relation.name}</h3>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-primary dark:hover:bg-slate-600"><XIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-text-secondary">Question Columns:</h4>
                        <p className="pl-4">{relation.questionCols.join(', ')}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-text-secondary">Answer Columns:</h4>
                        <p className="pl-4">{relation.answerCols.join(', ')}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-text-secondary">Compatible Modes:</h4>
                         <div className="pl-4 flex flex-wrap gap-2 mt-1">
                            {relation.modes.map(mode => (
                                <span key={mode} className="bg-primary dark:bg-slate-700 px-2 py-0.5 rounded-md text-xs">{mode}</span>
                            ))}
                        </div>
                    </div>
                     <div className="pt-4 border-t border-slate-300 dark:border-slate-600">
                        <h4 className="font-semibold text-text-secondary mb-2">Preview:</h4>
                        {randomRow ? (
                            <div className="bg-primary p-3 rounded-md space-y-2">
                                <div>
                                    <p className="text-sm text-text-secondary">Question:</p>
                                    {relation.questionCols.map(col => (
                                        <p key={col} className="text-text-primary ml-2"><strong>{col}:</strong> {getDisplayValue(randomRow, col)}</p>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary">Answer:</p>
                                    {relation.answerCols.map(col => (
                                        <p key={col} className="text-text-primary ml-2"><strong>{col}:</strong> {getDisplayValue(randomRow, col)}</p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-text-secondary text-center bg-primary p-3 rounded-md">No words in this table to generate a preview.</p>
                        )}
                    </div>
                </div>

                 <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const BulkTagModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tags: string[]) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [tagsInput, setTagsInput] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        if (tags.length > 0) {
            onConfirm(tags);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-sm w-full">
                <h3 className="text-xl font-bold text-accent mb-4">Bulk Add Tags</h3>
                <p className="text-sm text-text-secondary mb-3">Enter tags separated by commas. These tags will be added to all selected words.</p>
                <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g., verbs, chapter 1, difficult"
                    className="w-full bg-primary p-2 rounded-md border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                    autoFocus
                />
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg">
                        Add Tags
                    </button>
                </div>
            </div>
        </div>
    );
};

type AugmentedVocabRow = VocabRow & { priorityScore?: number };

const getRowValue = (row: AugmentedVocabRow, column: string, tableColumns: string[]): any => {
    if (column === 'PriorityScore') return row.priorityScore;
    if (column === 'keyword') return row.keyword;
    if (tableColumns.includes(column)) return row.data[column] || '';
    if (DEFAULT_COLUMNS.includes(column)) {
        if (column === 'Tags') return row.tags.join(', ');
        return row.stats[column as keyof VocabRowStats];
    }
    return '';
};

const checkCondition = (row: AugmentedVocabRow, layer: FilterLayer, table: VocabTable): boolean => {
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

const WordCardModal: React.FC<{
    word: VocabRow;
    table: VocabTable;
    onClose: () => void;
    onEdit: (word: VocabRow) => void;
    onDelete: (word: VocabRow) => void;
    visibleUserCols: string[];
    visibleStatCols: string[];
}> = ({ word, table, onClose, onEdit, onDelete, visibleUserCols, visibleStatCols }) => {
    
    const userColumns = table.columns.map(c => c.name);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                     <h3 className="text-2xl font-bold text-accent break-words">{word.keyword}</h3>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-primary dark:hover:bg-slate-600"><XIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                    {[...visibleUserCols, ...visibleStatCols]
                        .map(col => {
                            const value = getRowValue(word, col, userColumns);
                            let displayValue: React.ReactNode = value;
                            
                            if (DEFAULT_COLUMNS.includes(col)) {
                                if (col === 'SuccessRate' || col === 'FailureRate') {
                                    displayValue = `${(Number(value) * 100).toFixed(0)}%`;
                                } else if (col === 'QuitQueue') {
                                    displayValue = value ? 'Yes' : 'No';
                                } else if (value === null || value === undefined) {
                                    displayValue = 'N/A';
                                }
                            }

                            const colDef = table.columns.find(c => c.name === col);
                            if (colDef?.type === 'image' && value) {
                                return (
                                    <div key={col}>
                                        <p className="font-semibold text-text-secondary">{col}:</p>
                                        <img src={value} alt={word.keyword} className="mt-1 max-w-full h-auto rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                    </div>
                                )
                            }

                            return (
                                <div key={col} className="flex justify-between items-start gap-2">
                                    <span className="font-semibold text-text-secondary mr-2 shrink-0">{col}:</span>
                                    <span className="text-text-primary text-right break-words">{String(displayValue ?? '—')}</span>
                                </div>
                            );
                    })}
                </div>

                 <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-slate-600">
                    <button onClick={() => {onEdit(word); onClose();}} className="flex items-center gap-2 bg-primary dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 font-semibold py-2 px-4 rounded-lg">
                        <EditIcon className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => {onDelete(word); onClose();}} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
                        <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const TableDetailPage: React.FC = () => {
    const { tableId } = useParams<{ tableId: string }>();
    const { tables, relations, loading, fetchData } = useData();
    
    const table = useMemo(() => tables.find(t => t.id === tableId), [tables, tableId]);

    const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
    const [isEditWordModalOpen, setIsEditWordModalOpen] = useState(false);
    const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
    const [wordToEdit, setWordToEdit] = useState<VocabRow | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [filterLayers, setFilterLayers] = useState<FilterLayer[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
    const [sortLayers, setSortLayers] = useState<SortLayer[]>([]);
    const [infoRelation, setInfoRelation] = useState<Relation | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [relationsExpanded, setRelationsExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
    const [selectedWordForCard, setSelectedWordForCard] = useState<VocabRow | null>(null);

     useEffect(() => {
        if (table) {
            try {
                const storageKey = `vmind_view_mode_${table.id}`;
                const savedViewMode = localStorage.getItem(storageKey);
                if (savedViewMode === 'table' || savedViewMode === 'gallery') {
                    setViewMode(savedViewMode as 'table' | 'gallery');
                }
            } catch (e) {
                console.error("Failed to load view mode from localStorage", e);
            }
        }
    }, [table]);

    useEffect(() => {
        if (table) {
            const storageKey = `vmind_view_mode_${table.id}`;
            localStorage.setItem(storageKey, viewMode);
        }
    }, [viewMode, table]);

    useEffect(() => {
        if (table) {
            const loadSettings = () => {
                try {
                    const savedCols = localStorage.getItem(`vmind_visible_cols_${table.id}`);
                    if (savedCols) {
                        setVisibleColumns(new Set(JSON.parse(savedCols)));
                    } else {
                        const defaultVisible = [...table.columns.map(c => c.name), "Tags", "RankPoint", "SuccessRate", "LastPracticeDate"];
                        setVisibleColumns(new Set(defaultVisible));
                    }

                    const savedSorts = localStorage.getItem(`vmind_sort_layers_${table.id}`);
                    if (savedSorts) setSortLayers(JSON.parse(savedSorts));

                    const savedFilters = localStorage.getItem(`vmind_filter_layers_${table.id}`);
                    if (savedFilters) setFilterLayers(JSON.parse(savedFilters));
                } catch (e) {
                    console.error("Failed to load settings from localStorage", e);
                }
            };
            loadSettings();
        }
    }, [table]);

    useEffect(() => {
        if (table && visibleColumns.size > 0) {
            localStorage.setItem(`vmind_visible_cols_${table.id}`, JSON.stringify(Array.from(visibleColumns)));
        }
    }, [visibleColumns, table]);
    
    useEffect(() => {
        if (table) localStorage.setItem(`vmind_sort_layers_${table.id}`, JSON.stringify(sortLayers));
    }, [sortLayers, table]);

    useEffect(() => {
        if (table) localStorage.setItem(`vmind_filter_layers_${table.id}`, JSON.stringify(filterLayers));
    }, [filterLayers, table]);


    const handleToggleColumn = (column: string) => {
        setVisibleColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(column)) {
                newSet.delete(column);
            } else {
                newSet.add(column);
            }
            return newSet;
        });
    };
    
    const tableRelations = useMemo(() => relations.filter(r => r.tableId === tableId), [relations, tableId]);

    const handleSaveColumn = async (newColumn: ColumnDef) => {
        if (!tableId) return;
        if (table?.columns.some(c => c.name.toLowerCase() === newColumn.name.toLowerCase())) {
            throw new Error(`A column named "${newColumn.name}" already exists.`);
        }
        await dataService.addColumn(tableId, newColumn);
        fetchData();
    };
    
    const handleRenameColumn = async (oldName: string) => {
        const newName = prompt(`Rename column "${oldName}" to:`, oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName || !tableId) {
            return;
        }

        const trimmedNewName = newName.trim();
        
        if (table?.columns.some(c => c.name === trimmedNewName)) {
            alert(`Error: A column named "${trimmedNewName}" already exists.`);
            return;
        }
        
        if (trimmedNewName.toLowerCase() === 'keyword') {
            alert(`Error: "keyword" is a reserved name and cannot be used.`);
            return;
        }
        
        await dataService.renameColumn(tableId, oldName, trimmedNewName);
        fetchData();
    };


    const handleDeleteColumn = async (colName: string) => {
        if (window.confirm(`Are you sure you want to delete the column "${colName}"? This cannot be undone.`)) {
            if (tableId) {
                await dataService.removeColumn(tableId, colName);
                fetchData();
            }
        }
    };
    
    const parseCSV = (text: string): { headers: string[], rows: Array<Record<string, string>> } => {
        const lines = text.trim().replace(/\r/g, '').split('\n');
        if (lines.length < 2) return { headers: [], rows: [] };
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
            }, {} as Record<string, string>);
        });
        return { headers, rows };
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !table) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const { headers, rows } = parseCSV(text);
            const columnNames = table.columns.map(c => c.name);

            const requiredHeaders = ['keyword', ...columnNames];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
                alert(`CSV is missing required columns: ${missingHeaders.join(', ')}.\nYour CSV must have these columns: ${requiredHeaders.join(', ')}`);
                if (fileInputRef.current) fileInputRef.current.value = ''; 
                return;
            }

            const existingKeywords = new Set(table.rows.map(r => r.keyword.toLowerCase()));
            const newRows: Array<Record<string, string>> = [];
            const conflictingRows: Array<Record<string, string>> = [];

            rows.forEach(row => {
                if (row.keyword && existingKeywords.has(row.keyword.toLowerCase())) {
                    conflictingRows.push(row);
                } else if (row.keyword) {
                    newRows.push(row);
                }
            });
            
            setParsedData({ newRows, conflictingRows, headers: requiredHeaders });
            setIsImportModalOpen(true);
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
    };

    const handleImportConfirm = async (strategy: ConflictResolutionStrategy) => {
        if (!parsedData || !tableId) return;

        const allRows = [...parsedData.conflictingRows, ...parsedData.newRows];
        await dataService.importData(tableId, allRows, strategy);
        
        setIsImportModalOpen(false);
        setParsedData(null);
        fetchData();
    };

    const handleSaveWord = async (keyword: string, data: Record<string, string>) => {
        if (!tableId) return;
        try {
            await dataService.addWord(tableId, keyword, data);
            await fetchData();
            setIsAddWordModalOpen(false); 
        } catch (error) {
            throw error;
        }
    };

    const handleEditWord = (word: VocabRow) => {
        setWordToEdit(word);
        setIsEditWordModalOpen(true);
    };

    const handleUpdateWord = async (wordId: string, keyword: string, data: Record<string, string>) => {
        if (!tableId) return;
        try {
            await dataService.updateWord(tableId, wordId, keyword, data);
            await fetchData();
            setIsEditWordModalOpen(false);
            setWordToEdit(null);
        } catch (error) {
            throw error;
        }
    };

    const handleDeleteWord = async (word: VocabRow) => {
        if (window.confirm(`Are you sure you want to delete the word "${word.keyword}"? This action cannot be undone.`)) {
            if (!tableId) return;
            try {
                await dataService.deleteWord(tableId, word.id);
                await fetchData();
            } catch (error) {
                console.error("Failed to delete word:", error);
                alert("An error occurred while trying to delete the word.");
            }
        }
    };

    const handleResetStats = async (word: VocabRow) => {
        if (window.confirm(`Are you sure you want to reset all stats for "${word.keyword}"? This will mark the word as new and cannot be undone.`)) {
            if (tableId) {
                await dataService.resetWordStats(tableId, word.id);
                await fetchData();
            }
        }
    };
    
    const handleSelectRow = (rowId: string) => {
        setSelectedRowIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            } else {
                newSet.add(rowId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRowIds(new Set(processedRows.map(r => r.id)));
        } else {
            setSelectedRowIds(new Set());
        }
    };

    const handleBulkTagConfirm = async (tags: string[]) => {
        if (tableId && selectedRowIds.size > 0) {
            await dataService.bulkTagWords(tableId, Array.from(selectedRowIds), tags);
            await fetchData();
            setSelectedRowIds(new Set()); // Deselect after action
        }
    };


    if (loading) return <div className="p-4 sm:p-6 text-center">Loading table...</div>;
    if (!table) return (
        <div className="p-4 sm:p-6 text-center">
            <h2 className="text-2xl font-bold text-red-400">Table not found.</h2>
            <Link to="/tables" className="text-accent hover:underline mt-4 inline-block">Return to all tables</Link>
        </div>
    );

    const processedRows: AugmentedVocabRow[] = useMemo(() => {
        if (!table) return [];
        
        const maxInQueueInTable = table.rows.length > 0 ? Math.max(...table.rows.map(r => r.stats.InQueue)) : 0;
            
        let rows: AugmentedVocabRow[] = table.rows.map(row => ({
            ...row,
            priorityScore: dataService.calculatePriorityScore(row, maxInQueueInTable)
        }));

        if (filterLayers.length > 0) {
            rows = rows.filter(row => filterLayers.every(layer => checkCondition(row, layer, table)));
        }

        if (sortLayers.length > 0) {
            const columnNames = table.columns.map(c => c.name);
            rows.sort((a, b) => {
                for (const { column, direction } of sortLayers) {
                    let valA = getRowValue(a, column, columnNames);
                    let valB = getRowValue(b, column, columnNames);
                    
                    let comparison = 0;
                    if (valA === null || valA === undefined) comparison = 1;
                    else if (valB === null || valB === undefined) comparison = -1;
                    else if (typeof valA === 'string' && typeof valB === 'string') {
                        comparison = valA.localeCompare(valB, undefined, { numeric: true });
                    } else if (typeof valA === 'number' && typeof valB === 'number') {
                        comparison = valA - valB;
                    } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
                        comparison = (valA === valB) ? 0 : valA ? -1 : 1;
                    }
                    
                    if (comparison !== 0) {
                        return direction === 'asc' ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }
        return rows;
    }, [table, filterLayers, sortLayers]);

    const userColumns = table.columns.map(c => c.name);
    const visibleUserCols = userColumns.filter(c => visibleColumns.has(c));
    const visibleStatCols = DEFAULT_COLUMNS.filter(c => visibleColumns.has(c));
    const headers = ['keyword', ...visibleUserCols, ...visibleStatCols];
    const allSortableColumns = ['keyword', ...userColumns, ...DEFAULT_COLUMNS];

    return (
        <div className="p-4 sm:p-6">
            <Link to="/tables" className="text-accent hover:underline mb-4 inline-block">&larr; Back to all tables</Link>
            <h1 className="text-3xl font-bold text-text-primary">{table.name}</h1>

            <div className="my-6 space-y-4">
                <div className="flex items-center flex-wrap gap-2 md:gap-4">
                     <button onClick={() => setIsAddWordModalOpen(true)} className="flex items-center bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors duration-200">
                        <PlusIcon className="w-5 h-5 mr-2" /> Add Word
                    </button>
                    <button onClick={() => setIsAddColumnModalOpen(true)} className="flex items-center bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors duration-200">
                        <PlusIcon className="w-5 h-5 mr-2" /> Add Column
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200">
                        <ImportIcon className="w-5 h-5 mr-2" /> Import CSV
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden" />
                    <div className="flex-grow"></div>
                     <div className="flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
                        <button onClick={() => setViewMode('table')} title="Table View" className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-primary dark:bg-slate-600 shadow' : 'text-text-secondary hover:bg-primary/50 dark:hover:bg-slate-700'}`}>
                            <TableIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewMode('gallery')} title="Gallery View" className={`p-2 rounded-md transition-colors ${viewMode === 'gallery' ? 'bg-primary dark:bg-slate-600 shadow' : 'text-text-secondary hover:bg-primary/50 dark:hover:bg-slate-700'}`}>
                            <LayoutGridIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <FilterToggle 
                        allColumns={allSortableColumns}
                        columnDefs={table.columns}
                        filterLayers={filterLayers}
                        onFilterChange={setFilterLayers}
                    />
                     <SortToggle 
                        allColumns={allSortableColumns}
                        sortLayers={sortLayers}
                        onSortChange={setSortLayers}
                    />
                     <ColumnsToggle 
                        userColumns={userColumns}
                        defaultColumns={DEFAULT_COLUMNS}
                        visibleColumns={visibleColumns}
                        onToggle={handleToggleColumn}
                    />
                </div>
                {selectedRowIds.size > 0 && (
                    <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg flex items-center justify-between">
                        <span className="font-semibold text-text-primary">{selectedRowIds.size} selected</span>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsBulkTagModalOpen(true)}
                                className="flex items-center bg-accent text-primary font-bold py-1 px-3 rounded-lg text-sm"
                            >
                                <TagIcon className="w-4 h-4 mr-1" /> Tag
                            </button>
                            <button onClick={() => setSelectedRowIds(new Set())} className="p-1 text-text-secondary hover:text-text-primary">
                                <XIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                )}
                {filterLayers.length > 0 && (
                     <div className="flex items-center flex-wrap gap-2 text-sm text-text-secondary">
                        Showing words where:
                        {filterLayers.map(layer => (
                            <div key={layer.id} className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md flex items-center gap-2">
                                <span><strong>{layer.column}</strong> {layer.condition} {layer.value && <em>"{layer.value}"</em>}</span>
                                <button onClick={() => setFilterLayers(f => f.filter(l => l.id !== layer.id))} className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600">
                                    <XIcon className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddWordModal
                isOpen={isAddWordModalOpen}
                onClose={() => setIsAddWordModalOpen(false)}
                onSave={handleSaveWord}
                table={table}
            />
            
            <AddColumnModal
                isOpen={isAddColumnModalOpen}
                onClose={() => setIsAddColumnModalOpen(false)}
                onSave={handleSaveColumn}
            />

            {wordToEdit && (
                <EditWordModal
                    isOpen={isEditWordModalOpen}
                    onClose={() => setIsEditWordModalOpen(false)}
                    onSave={handleUpdateWord}
                    table={table}
                    word={wordToEdit}
                />
            )}

            <ImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onConfirm={handleImportConfirm}
                data={parsedData}
            />
            
             <BulkTagModal 
                isOpen={isBulkTagModalOpen}
                onClose={() => setIsBulkTagModalOpen(false)}
                onConfirm={handleBulkTagConfirm}
            />
            
            {selectedWordForCard && (
                <WordCardModal
                    word={selectedWordForCard}
                    table={table}
                    onClose={() => setSelectedWordForCard(null)}
                    onEdit={handleEditWord}
                    onDelete={handleDeleteWord}
                    visibleUserCols={visibleUserCols}
                    visibleStatCols={visibleStatCols}
                />
            )}

            <RelationInfoModal 
                relation={infoRelation}
                table={table}
                onClose={() => setInfoRelation(null)}
            />

            <div className="my-8">
                <div className="flex justify-between items-center mb-4">
                     <button 
                        onClick={() => setRelationsExpanded(!relationsExpanded)} 
                        className="flex items-center gap-2 text-left p-2 -ml-2 rounded-md hover:bg-secondary dark:hover:bg-slate-700/50"
                        aria-expanded={relationsExpanded}
                        aria-controls="relations-list"
                    >
                        <h2 className="text-2xl font-bold text-text-primary">Relations</h2>
                        {relationsExpanded ? <ChevronUpIcon className="w-6 h-6 text-text-secondary" /> : <ChevronDownIcon className="w-6 h-6 text-text-secondary" />}
                    </button>
                    <Link to={`/tables/${tableId}/relations/new`} className="flex items-center bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors duration-200">
                        <PlusIcon className="w-5 h-5 mr-2" /> Create Relation
                    </Link>
                </div>
                {relationsExpanded && (
                    <div id="relations-list">
                    {tableRelations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tableRelations.map(rel => (
                                <div key={rel.id} className="bg-secondary p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-accent pr-2">{rel.name}</h3>
                                        <button onClick={() => setInfoRelation(rel)} className="p-1 text-text-secondary hover:text-accent rounded-full hover:bg-primary dark:hover:bg-slate-700" aria-label={`Info for ${rel.name}`}>
                                            <InfoIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                    <p className="text-sm text-text-secondary truncate">
                                        Q: {rel.questionCols.join(', ')}
                                    </p>
                                    <p className="text-sm text-text-secondary truncate">
                                        A: {rel.answerCols.join(', ')}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {rel.modes.map(mode => (
                                            <span key={mode} className="bg-primary dark:bg-slate-700 px-2 py-0.5 rounded-md text-xs">{mode}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-text-secondary text-center py-4 bg-secondary rounded-lg">No relations created for this table yet.</p>
                    )}
                    </div>
                )}
            </div>
            
            {viewMode === 'gallery' && (
                <div className="mb-4 flex items-center">
                    <input
                        id="select-all-gallery"
                        type="checkbox"
                        className="h-4 w-4 rounded accent-accent bg-primary border-slate-400 dark:border-slate-500"
                        checked={processedRows.length > 0 && selectedRowIds.size === processedRows.length}
                        onChange={handleSelectAll}
                        aria-label="Select all rows"
                    />
                    <label htmlFor="select-all-gallery" className="ml-2 text-sm text-text-secondary">
                        Select all ({processedRows.length})
                    </label>
                </div>
            )}

            {viewMode === 'table' && (
                <div className="overflow-auto bg-secondary rounded-lg border border-slate-300 dark:border-slate-700 max-h-[65vh]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                            <tr>
                                <th className="p-3 w-12 sticky left-0 top-0 z-20 bg-slate-100 dark:bg-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded accent-accent bg-primary border-slate-400 dark:border-slate-500"
                                        checked={processedRows.length > 0 && selectedRowIds.size === processedRows.length}
                                        onChange={handleSelectAll}
                                        aria-label="Select all rows"
                                    />
                                </th>
                                {headers.map((col) => (
                                    <th key={col} className={`p-3 font-semibold text-text-secondary sticky top-0 bg-slate-100 dark:bg-slate-700 z-10 ${col === 'keyword' ? 'left-12 sticky' : ''}`}>
                                        <div className="flex items-center">
                                            {col}
                                            {userColumns.includes(col) && (
                                                <ColumnHeaderMenu 
                                                    columnName={col}
                                                    onRename={handleRenameColumn}
                                                    onDelete={handleDeleteColumn}
                                                />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-slate-600">
                            {processedRows.map(row => (
                                <tr key={row.id} className="hover:bg-slate-200/50 dark:hover:bg-slate-700/50">
                                    <td className="p-3 w-12 sticky left-0 z-10 bg-secondary">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded accent-accent bg-primary border-slate-400 dark:border-slate-500"
                                            checked={selectedRowIds.has(row.id)}
                                            onChange={(e) => { e.stopPropagation(); handleSelectRow(row.id); }}
                                            aria-label={`Select ${row.keyword}`}
                                        />
                                    </td>
                                    {headers.map((col) => {
                                        const value = getRowValue(row, col, userColumns);
                                        let content: React.ReactNode;

                                        if (col === 'keyword') {
                                            content = (
                                                <div className="flex items-center justify-between min-w-[150px]">
                                                    <span>{value}</span>
                                                    <WordActionsMenu
                                                        word={row as VocabRow}
                                                        onEdit={handleEditWord}
                                                        onReset={handleResetStats}
                                                        onDelete={handleDeleteWord}
                                                    />
                                                </div>
                                            );
                                        } else {
                                            const colDef = table.columns.find(c => c.name === col);
                                            if (colDef?.type === 'image' && value) {
                                                content = <img src={value} alt={row.keyword} className="h-10 w-16 object-cover rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />;
                                            } else if (col === 'PriorityScore') {
                                                content = value !== undefined && value !== null ? Number(value).toFixed(2) : 'N/A';
                                            } else if (col === 'SuccessRate' || col === 'FailureRate') {
                                                content = value !== undefined && value !== null ? `${(Number(value) * 100).toFixed(0)}%` : 'N/A';
                                            } else if (typeof value === 'boolean') {
                                                content = value ? 'Yes' : 'No';
                                            } else {
                                                content = String(value ?? '');
                                            }
                                        }
                                        
                                        return (
                                            <td key={`${row.id}-${col}`} className={`p-3 ${col === 'keyword' ? 'font-medium text-text-primary sticky left-12 bg-secondary' : ''}`}>
                                                {content}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {processedRows.length === 0 && viewMode === 'table' && (
                        <div className="text-center p-6 text-text-secondary">
                            <p>{table.rows.length > 0 ? "No words match your filter." : "This table is empty."}</p>
                            {table.rows.length === 0 && (
                                <button onClick={() => setIsAddWordModalOpen(true)} className="mt-4 flex items-center mx-auto bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors duration-200">
                                    <PlusIcon className="w-5 h-5 mr-2" /> Add your first word
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'gallery' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {processedRows.map(row => {
                        const firstVisibleImageCol = table.columns.find(c => c.type === 'image' && visibleColumns.has(c.name));
                        const imageUrl = firstVisibleImageCol ? row.data[firstVisibleImageCol.name] : null;

                        return (
                            <div key={row.id} className="bg-secondary rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm relative group flex flex-col">
                                {imageUrl && (
                                    <img src={imageUrl} alt={row.keyword} className="w-full h-32 object-cover rounded-t-lg" onError={(e) => e.currentTarget.style.display = 'none'} />
                                )}
                                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                                    <WordActionsMenu 
                                        word={row}
                                        onEdit={handleEditWord}
                                        onReset={handleResetStats}
                                        onDelete={handleDeleteWord}
                                    />
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded accent-accent bg-primary border-slate-400 dark:border-slate-500"
                                        checked={selectedRowIds.has(row.id)}
                                        onChange={() => handleSelectRow(row.id)}
                                        aria-label={`Select ${row.keyword}`}
                                    />
                                </div>
                                <div className="p-4 flex-grow flex flex-col min-h-[120px]">
                                    <h3 className="font-bold text-lg text-text-primary break-words pr-16">{row.keyword}</h3>
                                    
                                    <div className="mt-2 flex-grow overflow-y-auto space-y-1 text-sm pr-2">
                                        {[...visibleUserCols, ...visibleStatCols]
                                            .filter(col => col !== firstVisibleImageCol?.name) // Don't show image URL as text
                                            .map(col => {
                                                const value = getRowValue(row, col, userColumns);
                                                let displayValue: React.ReactNode = value;
                                                
                                                if (DEFAULT_COLUMNS.includes(col)) {
                                                    if (col === 'SuccessRate' || col === 'FailureRate') {
                                                        displayValue = `${(Number(value) * 100).toFixed(0)}%`;
                                                    } else if (col === 'QuitQueue') {
                                                        displayValue = value ? 'Yes' : 'No';
                                                    } else if (value === null || value === undefined) {
                                                        displayValue = 'N/A';
                                                    }
                                                }

                                                return (
                                                    <div key={col} className="flex justify-between items-start gap-2">
                                                        <span className="font-semibold text-text-secondary mr-2 shrink-0">{col}:</span>
                                                        <span className="text-text-primary text-right break-words">{String(displayValue ?? '—')}</span>
                                                    </div>
                                                );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            
            {processedRows.length === 0 && (
                <div className="text-center p-6 text-text-secondary">
                    <p>{table.rows.length > 0 ? "No words match your filter." : "This table is empty."}</p>
                     {table.rows.length === 0 && (
                        <button onClick={() => setIsAddWordModalOpen(true)} className="mt-4 flex items-center mx-auto bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors duration-200">
                            <PlusIcon className="w-5 h-5 mr-2" /> Add your first word
                        </button>
                    )}
                </div>
            )}

        </div>
    );
};

export default TableDetailPage;