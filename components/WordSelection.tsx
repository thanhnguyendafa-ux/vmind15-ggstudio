import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VocabRow, VocabTable, ColumnDef, FilterLayer, SortLayer, TableFocus } from '../types';
import { SortIcon, XIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';
import { DEFAULT_COLUMNS } from '../constants';
import FilterToggle from './FilterToggle';
import { getColumnType, checkCondition, getRowValue } from '../utils';

// --- SORT TOGGLE COMPONENT ---
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
            onSortChange([...sortLayers, { column: 'RankPoint', direction: 'asc' }]);
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
                className="flex items-center bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors duration-200"
                aria-haspopup="true" aria-expanded={isOpen}
            >
                <SortIcon className="w-4 h-4 mr-1" /> Sort
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-primary border border-slate-600 rounded-md shadow-lg z-20 p-3 space-y-3">
                    {sortLayers.map((layer, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-secondary p-2 rounded-md">
                            <select
                                value={layer.column}
                                onChange={e => handleLayerChange(index, { column: e.target.value })}
                                className="flex-grow bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-600"
                            >
                                {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                                value={layer.direction}
                                onChange={e => handleLayerChange(index, { direction: e.target.value as 'asc' | 'desc' })}
                                className="bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-600"
                            >
                                <option value="asc">Asc</option>
                                <option value="desc">Desc</option>
                            </select>
                            <button onClick={() => handleRemoveLayer(index)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sortLayers.length < 3 && (
                        <button onClick={handleAddLayer} className="flex items-center justify-center w-full bg-secondary hover:bg-slate-200 dark:hover:bg-slate-600 py-2 rounded-lg text-sm">
                            <PlusIcon className="w-4 h-4 mr-2" /> Add Sort Layer
                        </button>
                    )}
                    {sortLayers.length === 0 && <p className="text-sm text-center text-text-secondary py-2">No sort criteria applied.</p>}
                </div>
            )}
        </div>
    );
};


// --- SAME FOCUS MODAL ---
interface SameFocusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (focus: { filterLayers: FilterLayer[], sortLayers: SortLayer[] }) => void;
    allColumns: string[];
    allColumnDefs: ColumnDef[];
}
const SameFocusModal: React.FC<SameFocusModalProps> = ({ isOpen, onClose, onApply, allColumns, allColumnDefs }) => {
    const [filterLayers, setFilterLayers] = useState<FilterLayer[]>([]);
    const [sortLayers, setSortLayers] = useState<SortLayer[]>([]);
    
    if (!isOpen) return null;

    const handleApply = () => {
        onApply({ filterLayers, sortLayers });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-2xl w-full space-y-4">
                <h3 className="text-2xl font-bold text-accent">Set Same Focus for All Tables</h3>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Filter</label>
                    <FilterToggle isPrimary={false} allColumns={allColumns} columnDefs={allColumnDefs} filterLayers={filterLayers} onFilterChange={setFilterLayers} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Sort</label>
                    <SortToggle allColumns={allColumns} sortLayers={sortLayers} onSortChange={setSortLayers} />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                     <button onClick={onClose} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg">Cancel</button>
                     <button onClick={handleApply} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg">Apply to All</button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN WORD SELECTION COMPONENT ---
interface WordSelectionProps {
    tables: VocabTable[];
    selectedTableIds: string[];
    onSelectionChange: (words: VocabRow[]) => void;
    initialSelection: VocabRow[];
    tableFocus: Record<string, TableFocus>;
    onTableFocusChange: (newFocus: Record<string, TableFocus>) => void;
}

const WordSelection: React.FC<WordSelectionProps> = ({ tables, selectedTableIds, onSelectionChange, initialSelection, tableFocus, onTableFocusChange }) => {
    const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(() => new Set(initialSelection.map(w => w.id)));
    const [isSameFocusModalOpen, setIsSameFocusModalOpen] = useState(false);
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    
    const selectedTables = useMemo(() => tables.filter(t => selectedTableIds.includes(t.id)), [tables, selectedTableIds]);

    useEffect(() => {
        const newFocus: Record<string, TableFocus> = {};
        let updated = false;
        selectedTables.forEach(t => {
            newFocus[t.id] = tableFocus[t.id] || { filterLayers: [], sortLayers: [] };
            if(!tableFocus[t.id]) updated = true;
        });
        if(updated) onTableFocusChange(newFocus);

        if (selectedTables.length > 0 && expandedTables.size === 0) {
            setExpandedTables(new Set([selectedTables[0].id]));
        } else {
            const currentExpanded = new Set(expandedTables);
            selectedTableIds.forEach(id => currentExpanded.add(id));
            setExpandedTables(currentExpanded);
        }
    }, [selectedTableIds, tables]);

    const allSortableColumns = useMemo(() => {
        const userCols = selectedTables.flatMap(t => t.columns.map(c => c.name));
        return ['keyword', ...Array.from(new Set(userCols)), ...DEFAULT_COLUMNS];
    }, [selectedTables]);
    
    const allColumnDefs = useMemo(() => {
        const defs: ColumnDef[] = [];
        const seenNames = new Set<string>();
        selectedTables.forEach(table => {
            table.columns.forEach(colDef => {
                if (!seenNames.has(colDef.name)) {
                    defs.push(colDef);
                    seenNames.add(colDef.name);
                }
            });
        });
        return defs;
    }, [selectedTables]);


    const processedDataByTable = useMemo(() => {
        const result: Record<string, VocabRow[]> = {};
        for (const table of selectedTables) {
            const focus = tableFocus[table.id] || { filterLayers: [], sortLayers: [] };
            
            let rows = [...table.rows];

            if (focus.filterLayers.length > 0) {
                rows = rows.filter(row => focus.filterLayers.every(layer => checkCondition(row, layer, table)));
            }
            const columnNames = table.columns.map(c => c.name);
            if (focus.sortLayers.length > 0) {
                rows.sort((a, b) => {
                    for (const { column, direction } of focus.sortLayers) {
                        const valA = getRowValue(a, column, columnNames);
                        const valB = getRowValue(b, column, columnNames);
                        
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
                        
                        if (comparison !== 0) return direction === 'asc' ? comparison : -comparison;
                    }
                    return 0;
                });
            }
            result[table.id] = rows;
        }
        return result;
    }, [selectedTables, tableFocus]);

    useEffect(() => {
        const allWords = selectedTables.flatMap(t => t.rows);
        const newSelection = allWords.filter(w => selectedWordIds.has(w.id));
        onSelectionChange(newSelection);
    }, [selectedWordIds, onSelectionChange]);


    const handleManualToggle = (wordId: string) => {
        setSelectedWordIds(prev => {
            const newSet = new Set(prev);
            newSet.has(wordId) ? newSet.delete(wordId) : newSet.add(wordId);
            return newSet;
        });
    };

    const handleQuickSelect = (totalCount: number) => {
        const numTables = selectedTables.length;
        if (numTables === 0) return;

        const baseCount = Math.floor(totalCount / numTables);
        const remainder = totalCount % numTables;
        
        const countsPerTable = Array(numTables).fill(baseCount);
        for (let i = 0; i < remainder; i++) {
            countsPerTable[i]++;
        }

        const newSelectedIds = new Set<string>();
        selectedTables.forEach((table, index) => {
            const processedRowsForTable = processedDataByTable[table.id];
            const countForThisTable = countsPerTable[index];
            const wordsToSelect = processedRowsForTable.slice(0, countForThisTable);
            wordsToSelect.forEach(word => newSelectedIds.add(word.id));
        });

        setSelectedWordIds(newSelectedIds);
    };

    const handleApplySameFocus = (focus: { filterLayers: FilterLayer[], sortLayers: SortLayer[] }) => {
        const newTableFocus: Record<string, TableFocus> = {};
        selectedTables.forEach(t => {
            newTableFocus[t.id] = { ...focus };
        });
        onTableFocusChange(newTableFocus);
    };
    
    const handleFocusChange = (tableId: string, newFocus: Partial<TableFocus>) => {
        const newFullFocus = {
            ...tableFocus,
            [tableId]: { ...tableFocus[tableId], ...newFocus }
        };
        onTableFocusChange(newFullFocus);
    };

    const toggleTableExpansion = (tableId: string) => {
        setExpandedTables(prev => {
            const newSet = new Set(prev);
            newSet.has(tableId) ? newSet.delete(tableId) : newSet.add(tableId);
            return newSet;
        });
    };

    return (
        <div className="bg-secondary p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Word List</h3>
                <button onClick={() => setIsSameFocusModalOpen(true)} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-sky-500">Same Focus</button>
            </div>
            
            <SameFocusModal isOpen={isSameFocusModalOpen} onClose={() => setIsSameFocusModalOpen(false)} onApply={handleApplySameFocus} allColumns={allSortableColumns} allColumnDefs={allColumnDefs}/>

            <div>
                <label className="block text-text-secondary mb-2">Quick Select</label>
                <div className="grid grid-cols-4 gap-2 bg-primary p-1 rounded-lg">
                    {[5, 8, 13, 21].map(count => (
                        <button key={count} onClick={() => handleQuickSelect(count)} className={`py-2 rounded-md font-semibold transition-all hover:bg-slate-200 dark:hover:bg-slate-600`}>
                            {count}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-text-secondary text-center mt-1">Selects top words, balanced across tables, based on each table's focus.</p>
            </div>
            
            <p className="text-text-secondary">Or, select manually. ({selectedWordIds.size} selected)</p>

            <div className="space-y-2">
                {selectedTables.map(table => {
                    const isExpanded = expandedTables.has(table.id);
                    const focus = tableFocus[table.id] || { filterLayers: [], sortLayers: [] };
                    const processedRowsForTable = processedDataByTable[table.id] || [];
                    
                    return (
                        <div key={table.id} className="bg-primary rounded-lg border border-slate-600">
                            <button onClick={() => toggleTableExpansion(table.id)} className="w-full flex justify-between items-center p-3 text-left font-bold" aria-expanded={isExpanded}>
                                {table.name} ({processedRowsForTable.length} words)
                                {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                            </button>
                            {isExpanded && (
                                <div className="p-3 border-t border-slate-600 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FilterToggle isPrimary={false} allColumns={allSortableColumns} columnDefs={table.columns} filterLayers={focus.filterLayers} onFilterChange={layers => handleFocusChange(table.id, { filterLayers: layers })} />
                                        <SortToggle allColumns={allSortableColumns} sortLayers={focus.sortLayers} onSortChange={layers => handleFocusChange(table.id, { sortLayers: layers })} />
                                    </div>
                                    <div className="h-48 overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <tbody>
                                                {processedRowsForTable.map(row => (
                                                    <tr key={row.id} className="hover:bg-slate-700/50 cursor-pointer" onClick={() => handleManualToggle(row.id)}>
                                                        <td className="p-2 text-center w-10">
                                                            <input type="checkbox" checked={selectedWordIds.has(row.id)} readOnly className="h-4 w-4 rounded accent-accent bg-primary border-slate-500" />
                                                        </td>
                                                        <td className="p-2 font-semibold text-text-primary">{row.keyword}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {processedRowsForTable.length === 0 && <p className="text-center text-sm text-text-secondary p-4">No words match filter.</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WordSelection;