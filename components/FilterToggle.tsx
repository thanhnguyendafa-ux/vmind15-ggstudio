
import React, { useState, useEffect, useRef } from 'react';
import { FilterIcon, XIcon, PlusIcon } from './Icons';
import { getColumnType } from '../utils';
import { ColumnDef } from '../types';

// --- TYPES FOR FILTER ---

export type FilterCondition = 
  'contains' | 'doesNotContain' | 'equals' | 'notEquals' |
  'greaterThan' | 'lessThan' | 'is' | 'isEmpty' | 'isNotEmpty';

export interface FilterLayer {
    id: string;
    column: string;
    condition: FilterCondition;
    value: string;
}

// --- COLUMN TYPE HELPERS ---

export const conditionsByType: Record<'text' | 'image' | 'number' | 'boolean', { value: FilterCondition, label: string }[]> = {
    text: [
        { value: 'contains', label: 'Contains' },
        { value: 'doesNotContain', label: 'Does not contain' },
        { value: 'equals', label: 'Is' },
        { value: 'isEmpty', label: 'Is empty' },
        { value: 'isNotEmpty', label: 'Is not empty' },
    ],
    image: [
        { value: 'contains', label: 'Contains URL' },
        { value: 'isEmpty', label: 'Is empty' },
        { value: 'isNotEmpty', label: 'Is not empty' },
    ],
    number: [
        { value: 'equals', label: '=' },
        { value: 'notEquals', label: '!=' },
        { value: 'greaterThan', label: '>' },
        { value: 'lessThan', label: '<' },
    ],
    boolean: [
        { value: 'is', label: 'Is' },
    ]
};

// --- FILTER TOGGLE COMPONENT ---

interface FilterToggleProps {
    allColumns: string[];
    columnDefs: ColumnDef[];
    filterLayers: FilterLayer[];
    onFilterChange: (layers: FilterLayer[]) => void;
    isPrimary?: boolean; // To control button style
}

const FilterToggle: React.FC<FilterToggleProps> = ({ allColumns, columnDefs, filterLayers, onFilterChange, isPrimary = true }) => {
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
        const defaultColumn = 'RankPoint';
        const defaultCondition = conditionsByType[getColumnType(defaultColumn, columnDefs)][0].value;
        onFilterChange([...filterLayers, { id: Date.now().toString(), column: defaultColumn, condition: defaultCondition, value: '' }]);
    };
    
    const handleRemoveLayer = (id: string) => {
        onFilterChange(filterLayers.filter(l => l.id !== id));
    };

    const handleLayerChange = (id: string, newLayer: Partial<FilterLayer>) => {
        const newLayers = filterLayers.map(l => {
            if (l.id === id) {
                const updatedLayer = { ...l, ...newLayer };
                // If column changes, reset condition to the first valid one
                if (newLayer.column) {
                    const newType = getColumnType(newLayer.column, columnDefs);
                    updatedLayer.condition = conditionsByType[newType][0].value;
                    updatedLayer.value = ''; // Reset value on column change
                }
                return updatedLayer;
            }
            return l;
        });
        onFilterChange(newLayers);
    };
    
    const renderValueInput = (layer: FilterLayer) => {
        const colType = getColumnType(layer.column, columnDefs);
        if (layer.condition === 'isEmpty' || layer.condition === 'isNotEmpty') {
            return <div className="flex-grow"></div>;
        }
        if (colType === 'boolean') {
            return (
                <select value={layer.value} onChange={e => handleLayerChange(layer.id, { value: e.target.value })} className="bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-300 dark:border-slate-600 w-24">
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
            );
        }
        return (
            <input type={colType === 'number' ? 'number' : 'text'} value={layer.value} onChange={e => handleLayerChange(layer.id, { value: e.target.value })} className="flex-grow bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-300 dark:border-slate-600" placeholder="Value..." />
        );
    };

    const buttonClasses = isPrimary
        ? "bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200"
        : "bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors duration-200";

    return (
        <div className="relative" ref={ref}>
             <button
                onClick={() => setIsOpen(p => !p)}
                className={`flex items-center ${buttonClasses}`}
                aria-haspopup="true" aria-expanded={isOpen}
            >
                <FilterIcon className="w-5 h-5 mr-2" /> Filter
            </button>
            {isOpen && (
                 <div className="absolute right-0 mt-2 w-96 bg-primary border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-20 p-3 space-y-3">
                    {filterLayers.map((layer) => {
                        const colType = getColumnType(layer.column, columnDefs);
                        const availableConditions = conditionsByType[colType];
                        return (
                             <div key={layer.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center bg-secondary p-2 rounded-md">
                                <select value={layer.column} onChange={e => handleLayerChange(layer.id, { column: e.target.value })} className="flex-grow bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-300 dark:border-slate-600">
                                    {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={layer.condition} onChange={e => handleLayerChange(layer.id, { condition: e.target.value as FilterCondition })} className="bg-primary dark:bg-slate-700 p-2 rounded-md text-sm border border-slate-300 dark:border-slate-600">
                                    {availableConditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                                {renderValueInput(layer)}
                                <button onClick={() => handleRemoveLayer(layer.id)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-full">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    })}
                     <button onClick={handleAddLayer} className="flex items-center justify-center w-full bg-secondary dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 py-2 rounded-lg text-sm">
                        <PlusIcon className="w-4 h-4 mr-2" /> Add Filter
                    </button>
                    {filterLayers.length === 0 && <p className="text-sm text-center text-text-secondary py-2">No filters applied.</p>}
                </div>
            )}
        </div>
    );
};

export default FilterToggle;