import React, { useState, useEffect } from 'react';
import { VocabTable } from '../types';

interface AddWordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (keyword: string, data: Record<string, string>) => Promise<void>;
    table: VocabTable;
}

const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onSave, table }) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Reset form when modal is opened for a new word
        if (isOpen) {
            const initialData: Record<string, string> = {};
            initialData['keyword'] = '';
            table.columns.forEach(col => {
                initialData[col.name] = '';
            });
            setFormData(initialData);
        }
    }, [isOpen, table.columns]);

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
            await onSave(keyword, data);
            onClose(); // Parent will close the modal on success
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
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold text-blue-600 dark:text-sky-400 mb-4">Add New Word</h3>
                
                <form className="overflow-y-auto space-y-4">
                    <div>
                        <label htmlFor="keyword" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Keyword</label>
                        <input
                            id="keyword"
                            name="keyword"
                            type="text"
                            value={formData['keyword'] || ''}
                            onChange={handleChange}
                            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-200 p-2 rounded-md border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-sky-500 focus:outline-none"
                            required
                        />
                    </div>

                    {table.columns.map(col => (
                         <div key={col.name}>
                            <label htmlFor={col.name} className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{col.name}</label>
                            <input
                                id={col.name}
                                name={col.name}
                                type="text"
                                value={formData[col.name] || ''}
                                onChange={handleChange}
                                className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-200 p-2 rounded-md border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-sky-500 focus:outline-none"
                            />
                        </div>
                    ))}
                </form>

                <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} disabled={isSaving} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-blue-700">
                        {isSaving ? 'Saving...' : 'Save Word'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWordModal;
