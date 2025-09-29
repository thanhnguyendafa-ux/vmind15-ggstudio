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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 v-modal-container" aria-modal="true" role="dialog">
            <div className="bg-secondary dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col v-modal-content">
                <h3 className="text-2xl font-black text-text-primary dark:text-slate-200 mb-4">Edit Word</h3>
                
                <form className="overflow-y-auto space-y-4 pr-2">
                    <div>
                        <label htmlFor="edit-keyword" className="block text-lg font-bold text-text-secondary dark:text-slate-400 mb-1">Keyword</label>
                        <input
                            id="edit-keyword"
                            name="keyword"
                            type="text"
                            value={formData['keyword'] || ''}
                            onChange={handleChange}
                            className="w-full bg-primary dark:bg-slate-700 text-text-primary dark:text-slate-200 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-accent dark:focus:ring-accent focus:outline-none"
                            required
                        />
                    </div>

                    {table.columns.map(col => (
                         <div key={col.name}>
                            <label htmlFor={`edit-${col.name}`} className="block text-lg font-bold text-text-secondary dark:text-slate-400 mb-1">{col.name}</label>
                            <input
                                id={`edit-${col.name}`}
                                name={col.name}
                                type="text"
                                value={formData[col.name] || ''}
                                onChange={handleChange}
                                className="w-full bg-primary dark:bg-slate-700 text-text-primary dark:text-slate-200 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-accent dark:focus:ring-accent focus:outline-none"
                            />
                        </div>
                    ))}
                </form>

                <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                     <button onClick={onClose} disabled={isSaving} className="bg-slate-200 dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-3 px-5 rounded-lg border-b-4 border-slate-300 dark:border-slate-900 active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving} className="bg-accent text-white font-bold py-3 px-5 rounded-lg border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditWordModal;