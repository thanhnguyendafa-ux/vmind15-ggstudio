
import React, { useState, useEffect } from 'react';
import { VocabTable, VocabRow } from '../types';

interface EditWordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (wordId: string, keyword: string, data: Record<string, string>) => Promise<void>;
    table: VocabTable;
    word: VocabRow;
}

const EditWordModal: React.FC<EditWordModalProps> = ({ isOpen, onClose, onSave, table, word }) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && word) {
            const initialData: Record<string, string> = {};
            initialData['keyword'] = word.keyword;
            table.columns.forEach(col => {
                // FIX: Use col.name as the key for both initialData and word.data, since 'col' is an object.
                initialData[col.name] = word.data[col.name] || '';
            });
            setFormData(initialData);
        }
    }, [isOpen, word, table.columns]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        const keyword = formData['keyword']?.trim();
        if (!keyword) {
            alert("Keyword cannot be empty.");
            return;
        }

        setIsSaving(true);
        const { keyword: kw, ...data } = formData;
        try {
            await onSave(word.id, keyword, data);
        } catch (error) {
            if (error instanceof Error) {
                alert(`Error: ${error.message}`);
            } else {
                alert("An unknown error occurred.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold text-accent mb-4">Edit Word</h3>
                
                <form className="overflow-y-auto space-y-4">
                    <div>
                        <label htmlFor="edit-keyword" className="block text-sm font-medium text-text-secondary mb-1">Keyword</label>
                        <input
                            id="edit-keyword"
                            name="keyword"
                            type="text"
                            value={formData['keyword'] || ''}
                            onChange={handleChange}
                            className="w-full bg-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                            required
                        />
                    </div>

                    {/* FIX: Use col.name for key and attributes, as 'col' is an object. */}
                    {table.columns.map(col => (
                         <div key={col.name}>
                            <label htmlFor={`edit-${col.name}`} className="block text-sm font-medium text-text-secondary mb-1">{col.name}</label>
                            <input
                                id={`edit-${col.name}`}
                                name={col.name}
                                type="text"
                                value={formData[col.name] || ''}
                                onChange={handleChange}
                                className="w-full bg-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                            />
                        </div>
                    ))}
                </form>

                <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-slate-600">
                    <button onClick={onClose} disabled={isSaving} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditWordModal;
