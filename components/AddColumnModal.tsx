
import React, { useState } from 'react';
import { ColumnDef } from '../types';

interface AddColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (column: ColumnDef) => Promise<void>;
}

const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onSave }) => {
    const [columnName, setColumnName] = useState('');
    const [columnType, setColumnType] = useState<'text' | 'image'>('text');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const trimmedName = columnName.trim();
        if (!trimmedName) {
            alert("Column name cannot be empty.");
            return;
        }
        if (trimmedName.toLowerCase() === 'keyword') {
             alert(`"keyword" is a reserved column name.`);
             return;
        }

        setIsSaving(true);
        try {
            await onSave({ name: trimmedName, type: columnType });
            setColumnName('');
            setColumnType('text');
            onClose();
        } catch (error) {
             if (error instanceof Error) {
                alert(`Error: ${error.message}`);
            } else {
                alert("An unknown error occurred while adding the column.");
            }
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-sm w-full">
                <h3 className="text-2xl font-bold text-accent mb-4">Add New Column</h3>
                
                <div className="mb-4">
                    <label htmlFor="column-name" className="block text-sm font-medium text-text-secondary mb-1">Column Name</label>
                    <input
                        id="column-name"
                        type="text"
                        value={columnName}
                        onChange={(e) => setColumnName(e.target.value)}
                        placeholder="e.g., Mnemonic"
                        className="w-full bg-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                        required
                        autoFocus
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="column-type" className="block text-sm font-medium text-text-secondary mb-1">Column Type</label>
                     <select
                        id="column-type"
                        value={columnType}
                        onChange={(e) => setColumnType(e.target.value as 'text' | 'image')}
                        className="w-full bg-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                    >
                        <option value="text">Text</option>
                        <option value="image">Image (URL)</option>
                    </select>
                </div>


                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} disabled={isSaving} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!columnName.trim() || isSaving} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed">
                        {isSaving ? 'Saving...' : 'Add Column'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddColumnModal;
