import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { StudyMode, Relation, VocabRow } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { WarningIcon, XIcon, BrainIcon } from '../components/Icons';
import WordSelection from '../components/WordSelection';

const StudyPage: React.FC = () => {
    const { tables, relations, loading } = useData();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
    const [selectedModes, setSelectedModes] = useState<StudyMode[]>([]);
    const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);
    const [useRandomRelation, setUseRandomRelation] = useState(false);
    const [selectedWords, setSelectedWords] = useState<VocabRow[]>([]);

    const handleTableToggle = (tableId: string) => {
        const newSelection = selectedTableIds.includes(tableId)
            ? selectedTableIds.filter(id => id !== tableId)
            : [...selectedTableIds, tableId];
        setSelectedTableIds(newSelection);
        // Reset subsequent steps
        setSelectedModes([]);
        setSelectedRelationIds([]);
        setUseRandomRelation(false);
        setSelectedWords([]);
    };
    
    const handleModeToggle = (mode: StudyMode) => {
        const newModes = selectedModes.includes(mode)
            ? selectedModes.filter(m => m !== mode)
            : [...selectedModes, mode];
        setSelectedModes(newModes);
        // Reset subsequent steps
        setSelectedRelationIds([]);
        setUseRandomRelation(false);
    };

    const handleRelationToggle = (relId: string) => {
        setSelectedRelationIds(prev =>
            prev.includes(relId) ? prev.filter(id => id !== relId) : [...prev, relId]
        );
    };

    const handleRandomRelationToggle = () => {
        const isEnabling = !useRandomRelation;
        setUseRandomRelation(isEnabling);
        if (isEnabling) {
            setSelectedRelationIds([]); // Clear specific selections when random is on
        }
    };

    const handleShuffleWords = () => {
        setSelectedWords(prev => [...prev].sort(() => Math.random() - 0.5));
    };

    const handleRemoveWord = (wordId: string) => {
        setSelectedWords(prev => prev.filter(w => w.id !== wordId));
    };

    const availableRelations = useMemo(() => {
        if (selectedTableIds.length === 0) return [];
        return relations.filter(r => selectedTableIds.includes(r.tableId));
    }, [relations, selectedTableIds]);
    
    const compatibleRelations = useMemo(() => {
        if(selectedModes.length === 0) return availableRelations;
        return availableRelations.filter(r => r.modes.some(m => selectedModes.includes(m)));
    }, [availableRelations, selectedModes]);

    const startStudySession = () => {
        navigate('/study-session', { 
            state: { 
                tableIds: selectedTableIds,
                modes: selectedModes,
                relationIds: selectedRelationIds,
                useRandomRelation,
                sortLayers: [], // Handled within WordSelection component
                wordCount: selectedWords.length,
                words: selectedWords
            } 
        });
    };
    
    const canProceed = () => {
        switch(step) {
            case 1: return selectedTableIds.length > 0;
            case 2: return selectedModes.length > 0;
            case 3: return useRandomRelation || selectedRelationIds.length > 0;
            case 4: return selectedWords.length >= 5;
            case 5: return selectedWords.length >= 5;
            default: return false;
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading study setup...</div>;
    }

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-text-primary">Setup Study Session</h1>
            
            <div className="flex items-center justify-center mb-6 space-x-2">
                {[1, 2, 3, 4, 5].map(s => (
                    <React.Fragment key={s}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-accent text-primary' : 'bg-secondary text-text-secondary'}`}>
                        {s}
                    </div>
                    {s < 5 && <div className={`h-1 flex-1 ${step > s ? 'bg-accent' : 'bg-secondary'}`}></div>}
                    </React.Fragment>
                ))}
            </div>

            {step === 1 && (
                <div>
                    <h2 className="text-xl font-semibold text-accent mb-4">Step 1: Select Tables</h2>
                     {tables.length > 0 ? (
                        <div className="space-y-2">
                            {tables.map(table => (
                                <label key={table.id} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedTableIds.includes(table.id) ? 'bg-accent text-primary font-bold' : 'bg-secondary'}`}>
                                    <input type="checkbox" checked={selectedTableIds.includes(table.id)} onChange={() => handleTableToggle(table.id)} className="mr-3 h-5 w-5 rounded accent-primary" />
                                    {table.name} ({table.rows.length} words)
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg text-center">
                            <WarningIcon className="w-8 h-8 mx-auto mb-2"/>
                            <p className="font-bold">No Tables Found</p>
                            <p className="text-sm mb-4">You need to create a table before you can start a study session.</p>
                            <Link to="/tables" className="bg-accent text-primary font-bold py-2 px-4 rounded-lg hover:bg-sky-500">
                                Create a Table
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {step === 2 && (
                <div>
                    <h2 className="text-xl font-semibold text-accent mb-4">Step 2: Select Modes</h2>
                    <p className="text-sm text-text-secondary mb-3">If you choose more than one, the mode will be randomized for each question.</p>
                    <div className="space-y-2">
                        {Object.values(StudyMode).map(mode => (
                             <label key={mode} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedModes.includes(mode) ? 'bg-accent text-primary font-bold' : 'bg-secondary'}`}>
                                <input type="checkbox" checked={selectedModes.includes(mode)} onChange={() => handleModeToggle(mode)} className="mr-3 h-5 w-5 rounded accent-primary" />
                                {mode}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h2 className="text-xl font-semibold text-accent mb-4">Step 3: Select Relations</h2>
                    <label className={`flex items-center p-3 rounded-lg cursor-pointer transition-all mb-4 ${useRandomRelation ? 'bg-accent text-primary font-bold' : 'bg-secondary'}`}>
                        <input type="checkbox" checked={useRandomRelation} onChange={handleRandomRelationToggle} className="mr-3 h-5 w-5 rounded accent-primary" />
                        Randomly select a relation for each question
                    </label>
                    {!useRandomRelation && (
                        <div className="space-y-2">
                            {compatibleRelations.length > 0 ? compatibleRelations.map(rel => (
                                <label key={rel.id} className={`flex items-center p-3 rounded-lg transition-all ${selectedRelationIds.includes(rel.id) ? 'bg-accent text-primary font-bold' : 'bg-secondary'}`}>
                                    <input type="checkbox" checked={selectedRelationIds.includes(rel.id)} onChange={() => handleRelationToggle(rel.id)} className="mr-3 h-5 w-5 rounded accent-primary" />
                                    <span>{rel.name}</span>
                                </label>
                            )) : (
                                <div className="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg" role="alert">
                                    <div className="flex">
                                        <div className="py-1"><WarningIcon className="w-6 h-6 mr-4" /></div>
                                        <div>
                                            <p className="font-bold">No Compatible Relations Found</p>
                                            <p className="text-sm mb-4">Please adjust your mode selection, or create a new relation for the selected tables.</p>
                                            <Link 
                                                to={`/tables/${selectedTableIds[0]}/relations/new`}
                                                state={{ preselectedModes: selectedModes }}
                                                className="bg-accent text-primary font-bold py-2 px-4 rounded-lg hover:bg-sky-500 text-sm"
                                            >
                                                Create Relation
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {step === 4 && (
                 <div>
                    <h2 className="text-xl font-semibold text-accent mb-4">Step 4: Focus & Select Words</h2>
                    <p className="text-sm text-text-secondary mb-3">Set a specific focus (filter & sort) for each table, or use 'Same Focus' to apply one setting to all. A minimum of 5 words is required.</p>
                    <WordSelection
                        tables={tables}
                        selectedTableIds={selectedTableIds}
                        onSelectionChange={setSelectedWords}
                        initialSelection={selectedWords}
                    />
                </div>
            )}
            
            {step === 5 && (
                 <div>
                    <h2 className="text-xl font-semibold text-accent mb-4">Step 5: Preview & Finalize</h2>
                    <div className="bg-secondary p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <p className="font-bold">Final List ({selectedWords.length} words)</p>
                            <button onClick={handleShuffleWords} className="bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-1 px-3 rounded-lg shadow-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200">Shuffle</button>
                        </div>
                        {selectedWords.length < 5 && (
                             <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-2 rounded-lg text-center mb-2">
                                <p>You need at least 5 words to start a session.</p>
                            </div>
                        )}
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                            {selectedWords.map(word => (
                                <div key={word.id} className="flex justify-between items-center bg-primary p-2 rounded-md">
                                    <span className="truncate">{word.keyword}</span>
                                    <button onClick={() => handleRemoveWord(word.id)} className="p-1 text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 rounded-full">
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-8 flex justify-between items-center">
                <button onClick={() => setStep(s => s - 1)} className={`bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${step === 1 ? 'invisible' : ''}`}>Back</button>
                
                {step < 5 && <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="bg-accent text-primary font-bold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed">Next</button>}
                
                {step === 5 && <button onClick={startStudySession} disabled={!canProceed()} className="flex items-center justify-center bg-accent text-primary font-bold py-3 px-6 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors">
                    <BrainIcon className="w-5 h-5 mr-2" /> Start Studying
                </button>}
            </div>
        </div>
    );
};

export default StudyPage;
