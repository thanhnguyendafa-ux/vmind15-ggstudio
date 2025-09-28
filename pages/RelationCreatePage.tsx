import React, { useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { StudyMode } from '../types';
import { dataService } from '../services/dataService';

const RelationCreatePage: React.FC = () => {
    const { tableId } = useParams<{ tableId: string }>();
    const { tables, fetchData } = useData();
    const location = useLocation();
    const navigate = useNavigate();

    const table = tables.find(t => t.id === tableId);
    const preselectedModes = location.state?.preselectedModes || [];

    const [name, setName] = useState('');
    const [questionCols, setQuestionCols] = useState<string[]>([]);
    const [answerCols, setAnswerCols] = useState<string[]>([]);
    const [modes, setModes] = useState<StudyMode[]>(preselectedModes);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!table) {
        return (
            <div className="p-4 sm:p-6 text-center">
                <h2 className="text-2xl font-bold text-red-400">Table not found.</h2>
                <Link to="/tables" className="text-accent hover:underline mt-4 inline-block">Return to all tables</Link>
            </div>
        );
    }
    
    const availableColumns = ['keyword', ...table.columns.map(c => c.name)];

    const handleColumnToggle = (col: string, type: 'question' | 'answer') => {
        const setCols = type === 'question' ? setQuestionCols : setAnswerCols;
        const otherCols = type === 'question' ? answerCols : questionCols;
        const setOtherCols = type === 'question' ? setAnswerCols : setQuestionCols;

        // Prevent selecting the same column for both question and answer
        if (otherCols.includes(col)) {
            setOtherCols(prev => prev.filter(c => c !== col));
        }

        setCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    const handleModeToggle = (mode: StudyMode) => {
        setModes(prev =>
            prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError("Relation name cannot be empty.");
            return;
        }
        if (questionCols.length === 0) {
            setError("You must select at least one question column.");
            return;
        }
        if (answerCols.length === 0) {
            setError("You must select at least one answer column.");
            return;
        }
        if (modes.length === 0) {
            setError("You must select at least one compatible study mode.");
            return;
        }
        
        const overlap = questionCols.some(qCol => answerCols.includes(qCol));
        if (overlap) {
            setError("Question and Answer columns cannot be the same. Please adjust your selection.");
            return;
        }

        setIsSaving(true);
        try {
            if (tableId) {
                await dataService.createRelation(tableId, name.trim(), questionCols, answerCols, modes);
                await fetchData(); // Update context
                navigate(`/tables/${tableId}`);
            }
        } catch (err) {
            setError("Failed to save the relation. Please try again.");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <Link to={tableId ? `/tables/${tableId}` : '/tables'} className="text-accent hover:underline mb-4 inline-block">&larr; Back to Table</Link>
            <h1 className="text-3xl font-bold mb-2 text-text-primary">Create New Relation</h1>
            <div className="mb-6 text-lg text-text-secondary">
                For table: <span className="font-semibold text-accent">{table.name}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="relation-name" className="block text-lg font-semibold text-accent mb-2">Relation Name</label>
                    <input
                        id="relation-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Definition to Word"
                        className="w-full bg-secondary p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-accent focus:outline-none"
                        aria-required="true"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <fieldset>
                        <legend className="text-lg font-semibold text-accent mb-2">Question Columns</legend>
                        <div className="bg-secondary p-3 rounded-lg space-y-2">
                            {availableColumns.map(col => (
                                <label key={`q-${col}`} className={`flex items-center p-2 rounded-md cursor-pointer ${questionCols.includes(col) ? 'bg-accent text-white font-bold' : 'hover:bg-slate-700/50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={questionCols.includes(col)}
                                        onChange={() => handleColumnToggle(col, 'question')}
                                        className="mr-3 h-5 w-5 rounded accent-primary"
                                    />
                                    {col}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="text-lg font-semibold text-accent mb-2">Answer Columns</legend>
                         <div className="bg-secondary p-3 rounded-lg space-y-2">
                            {availableColumns.map(col => (
                                <label key={`a-${col}`} className={`flex items-center p-2 rounded-md cursor-pointer ${answerCols.includes(col) ? 'bg-accent text-white font-bold' : 'hover:bg-slate-700/50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={answerCols.includes(col)}
                                        onChange={() => handleColumnToggle(col, 'answer')}
                                        className="mr-3 h-5 w-5 rounded accent-primary"
                                    />
                                    {col}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>

                <fieldset>
                    <legend className="text-lg font-semibold text-accent mb-2">Compatible Modes</legend>
                    <div className="bg-secondary p-3 rounded-lg space-y-2">
                        {Object.values(StudyMode).map(mode => (
                             <label key={mode} className={`flex items-center p-2 rounded-md cursor-pointer ${modes.includes(mode) ? 'bg-accent text-white font-bold' : 'hover:bg-slate-700/50'}`}>
                                <input
                                    type="checkbox"
                                    checked={modes.includes(mode)}
                                    onChange={() => handleModeToggle(mode)}
                                    className="mr-3 h-5 w-5 rounded accent-primary"
                                />
                                {mode}
                            </label>
                        ))}
                    </div>
                </fieldset>
                
                {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-center" role="alert">{error}</p>}

                <div className="flex justify-end">
                    <button type="submit" disabled={isSaving} className="bg-accent dark:bg-sky-500 text-white dark:text-slate-950 font-bold py-3 px-8 rounded-lg text-lg disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-blue-800 dark:hover:bg-sky-600 transition-colors">
                        {isSaving ? 'Saving...' : 'Create Relation'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RelationCreatePage;