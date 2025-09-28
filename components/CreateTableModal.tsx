
import React, { useState } from 'react';
import { XIcon } from './Icons';
import { ColumnDef } from '../types';

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, columns: ColumnDef[]) => Promise<void>;
}

const CreateTableModal: React.FC<CreateTableModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState<ColumnDef[]>([]);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnType, setNewColumnType] = useState<'text' | 'image'>('text');
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleAddColumn = () => {
        const trimmedName = newColumnName.trim();
        if (trimmedName && !columns.some(c => c.name === trimmedName) && trimmedName.toLowerCase() !== 'keyword') {
            setColumns([...columns, { name: trimmedName, type: newColumnType }]);
            setNewColumnName('');
            setNewColumnType('text');
        } else if (columns.some(c => c.name === trimmedName)) {
            alert(`Column "${trimmedName}" already exists.`);
        } else if (trimmedName.toLowerCase() === 'keyword') {
            alert(`"keyword" is a reserved column name.`);
        }
    };

    const handleRemoveColumn = (colToRemove: string) => {
        setColumns(columns.filter(col => col.name !== colToRemove));
    };

    const handleSubmit = async () => {
        if (!tableName.trim()) {
            alert("Table name cannot be empty.");
            return;
        }
        setIsCreating(true);
        await onCreate(tableName.trim(), columns);
        // Reset state for next time
        setTableName('');
        setColumns([]);
        setNewColumnName('');
        setIsCreating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-lg w-full">
                <h3 className="text-2xl font-bold text-accent mb-4">Create New Table</h3>
                
                <div className="mb-4">
                    <label htmlFor="table-name" className="block text-sm font-medium text-text-secondary mb-1">Table Name</label>
                    <input
                        id="table-name"
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        placeholder="e.g., Spanish Verbs"
                        className="w-full bg-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Columns</label>
                    <p className="text-xs text-text-secondary mb-2">The 'keyword' column is added automatically.</p>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                            placeholder="e.g., Definition"
                            className="flex-grow bg-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                         <select
                            value={newColumnType}
                            onChange={(e) => setNewColumnType(e.target.value as 'text' | 'image')}
                            className="bg-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                        >
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                        </select>
                        <button onClick={handleAddColumn} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg">Add</button>
                    </div>
                </div>

                <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
                    {columns.map(col => (
                        <div key={col.name} className="flex justify-between items-center bg-primary p-2 rounded-md">
                            <div>
                                <span>{col.name}</span>
                                <span className="text-xs ml-2 px-1.5 py-0.5 bg-slate-700 rounded-md">{col.type}</span>
                            </div>
                            <button onClick={() => handleRemoveColumn(col.name)} className="p-1 rounded-full hover:bg-red-500/20 text-red-400">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {columns.length === 0 && <p className="text-sm text-center text-text-secondary p-2">No columns added yet.</p>}
                </div>

                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} disabled={isCreating} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!tableName.trim() || isCreating} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed">
                        {isCreating ? 'Creating...' : 'Create Table'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTableModal;