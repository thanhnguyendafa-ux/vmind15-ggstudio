import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { StudyMode, Relation, VocabRow, TableFocus, StudyPreset } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { WarningIcon, XIcon, BrainIcon, BookmarkIcon, TrashIcon } from '../components/Icons';
import WordSelection from '../components/WordSelection';
import { dataService } from '../services/dataService';
import { checkCondition, getRowValue } from '../utils';

const StudyPage: React.FC = () => {
    const { tables, relations, studyPresets, loading, fetchData } = useData();
    const navigate = useNavigate();

    const [step, setStep] = useState(0); // Start at 0, wizard is hidden
    const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
    const [selectedModes, setSelectedModes] = useState<StudyMode[]>([]);
    const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);
    const [useRandomRelation, setUseRandomRelation] = useState(false);
    const [selectedWords, setSelectedWords] = useState<VocabRow[]>([]);
    const [tableFocus, setTableFocus] = useState<Record<string, TableFocus>>({});
    const [isPresetLoading, setIsPresetLoading] = useState<string | null>(null);

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
                sortLayers: [], // This is legacy, sorting is handled by tableFocus
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

    const handleSavePreset = async () => {
        const name = prompt("Enter a name for this preset:");
        if (name && name.trim()) {
            const newPreset: Omit<StudyPreset, 'id'> = {
                name: name.trim(),
                tableIds: selectedTableIds,
                modes: selectedModes,
                relationIds: selectedRelationIds,
                useRandomRelation: useRandomRelation,
                wordCount: selectedWords.length,
                tableFocus: tableFocus,
            };
            await dataService.saveStudyPreset(newPreset);
            await fetchData(); // Refresh presets
            alert(`Preset "${name.trim()}" saved!`);
        }
    };
    
    const handlePresetClick = async (preset: StudyPreset) => {
        setIsPresetLoading(preset.id);
        const presetTables = tables.filter(t => preset.tableIds.includes(t.id));
        const processedDataByTable: Record<string, VocabRow[]> = {};

        for (const table of presetTables) {
            const focus = preset.tableFocus[table.id] || { filterLayers: [], sortLayers: [] };
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
            processedDataByTable[table.id] = rows;
        }
        
        const baseCount = Math.floor(preset.wordCount / presetTables.length);
        const remainder = preset.wordCount % presetTables.length;
        const finalWords: VocabRow[] = [];
        presetTables.forEach((table, index) => {
            const count = baseCount + (index < remainder ? 1 : 0);
            finalWords.push(...processedDataByTable[table.id].slice(0, count));
        });

        if (finalWords.length < 5) {
            alert("This preset generates less than 5 words with the current data. Please edit your tables or the preset.");
            setIsPresetLoading(null);
            return;
        }

        navigate('/study-session', { 
            state: { 
                tableIds: preset.tableIds,
                modes: preset.modes,
                relationIds: preset.relationIds,
                useRandomRelation: preset.useRandomRelation,
                sortLayers: [],
                wordCount: finalWords.length,
                words: finalWords
            } 
        });
    };

    const handleDeletePreset = async (preset: StudyPreset) => {
        if (window.confirm(`Are you sure you want to delete the preset "${preset.name}"?`)) {
            await dataService.deleteStudyPreset(preset.id);
            await fetchData();
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading study setup...</div>;
    }

    const wizardVisible = step > 0;

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-3xl font-bold mb-6 text-text-primary">Setup Study Session</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Presets Column (Sidebar) */}
                <div className="lg:col-span-1 lg:sticky lg:top-6">
                    <div className="bg-secondary p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold text-accent mb-4">Study Presets</h2>
                        {studyPresets.length > 0 ? (
                            <div className="space-y-4">
                                {studyPresets.map(preset => (
                                    <div key={preset.id} className="bg-primary p-4 rounded-lg flex flex-col justify-between shadow-md">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-bold text-text-primary pr-2">{preset.name}</h3>
                                                <button onClick={() => handleDeletePreset(preset)} className="text-danger hover:text-red-300 p-1"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                            <p className="text-sm text-text-secondary">{preset.wordCount} words from: {tables.filter(t => preset.tableIds.includes(t.id)).map(t => t.name).join(', ')}</p>
                                        </div>
                                        <button
                                            onClick={() => handlePresetClick(preset)}
                                            disabled={!!isPresetLoading}
                                            className="mt-4 w-full bg-accent text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-wait hover:bg-accent-darker shadow-solid-accent active:translate-y-1 active:shadow-none"
                                        >
                                            {isPresetLoading === preset.id ? 'Loading...' : 'Start Now'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-text-secondary text-center bg-primary p-4 rounded-lg">No presets saved. Create one using the wizard!</p>
                        )}
                        <button onClick={() => setStep(1)} className="mt-4 text-accent hover:underline w-full text-center">
                            Or, create a new custom session...
                        </button>
                    </div>
                </div>

                {/* Main Content Column (Wizard) */}
                <div className="lg:col-span-2">
                    {wizardVisible && (
                        <div className="bg-secondary p-6 rounded-xl shadow-lg">
                            <div className="flex items-center justify-center mb-6 space-x-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <React.Fragment key={s}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-accent text-white' : 'bg-primary text-text-secondary'}`}>
                                        {s}
                                    </div>
                                    {s < 5 && <div className={`h-1 flex-1 ${step > s ? 'bg-accent' : 'bg-primary'}`}></div>}
                                    </React.Fragment>
                                ))}
                            </div>

                            {step === 1 && (
                                <div>
                                    <h2 className="text-xl font-semibold text-accent mb-4">Step 1: Select Tables</h2>
                                    {tables.length > 0 ? (
                                        <div className="space-y-2">
                                            {tables.map(table => (
                                                <label key={table.id} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedTableIds.includes(table.id) ? 'bg-accent text-white font-bold' : 'bg-primary hover:bg-slate-200'}`}>
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
                                            <Link to="/tables" className="bg-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-accent-darker">
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
                                            <label key={mode} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedModes.includes(mode) ? 'bg-accent text-white font-bold' : 'bg-primary hover:bg-slate-200'}`}>
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
                                    <label className={`flex items-center p-3 rounded-lg cursor-pointer transition-all mb-4 ${useRandomRelation ? 'bg-accent text-white font-bold' : 'bg-primary'}`}>
                                        <input type="checkbox" checked={useRandomRelation} onChange={handleRandomRelationToggle} className="mr-3 h-5 w-5 rounded accent-primary" />
                                        Randomly select a relation for each question
                                    </label>
                                    {!useRandomRelation && (
                                        <div className="space-y-2">
                                            {compatibleRelations.length > 0 ? compatibleRelations.map(rel => (
                                                <label key={rel.id} className={`flex items-center p-3 rounded-lg transition-all ${selectedRelationIds.includes(rel.id) ? 'bg-accent text-white font-bold' : 'bg-primary hover:bg-slate-200'}`}>
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
                                                                className="bg-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-accent-darker text-sm"
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
                                        tableFocus={tableFocus}
                                        onTableFocusChange={setTableFocus}
                                    />
                                </div>
                            )}
                            
                            {step === 5 && (
                                <div>
                                    <h2 className="text-xl font-semibold text-accent mb-4">Step 5: Preview & Finalize</h2>
                                    <div className="bg-primary p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="font-bold">Final List ({selectedWords.length} words)</p>
                                            <button onClick={handleShuffleWords} className="bg-secondary font-bold py-1 px-3 rounded-lg shadow-sm hover:bg-slate-200 transition-colors duration-200">Shuffle</button>
                                        </div>
                                        {selectedWords.length < 5 && (
                                            <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-2 rounded-lg text-center mb-2">
                                                <p>You need at least 5 words to start a session.</p>
                                            </div>
                                        )}
                                        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                                            {selectedWords.map(word => (
                                                <div key={word.id} className="flex justify-between items-center bg-secondary p-2 rounded-md">
                                                    <span className="truncate">{word.keyword}</span>
                                                    <button onClick={() => handleRemoveWord(word.id)} className="p-1 text-danger hover:text-red-400 rounded-full">
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        
                            <div className="mt-8 flex justify-between items-center">
                                <button onClick={() => setStep(s => s - 1)} className={`bg-slate-200 text-text-primary font-bold py-3 px-5 rounded-lg border-b-4 border-slate-300 active:translate-y-0.5 active:border-b-2 transition-all ${step === 1 ? 'invisible' : ''}`}>Back</button>
                                
                                {step < 5 && <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="bg-accent text-white font-bold py-3 px-8 rounded-lg border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2 disabled:bg-slate-500 disabled:border-slate-500 disabled:cursor-not-allowed">Next</button>}
                                
                                {step === 5 && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleSavePreset} disabled={!canProceed()} className="flex items-center justify-center bg-slate-200 text-text-primary font-bold py-3 px-4 rounded-lg border-b-4 border-slate-300 active:translate-y-0.5 active:border-b-2 disabled:bg-slate-500 disabled:border-slate-500 disabled:cursor-not-allowed transition-colors">
                                        <BookmarkIcon className="w-5 h-5 mr-2" /> Save as Preset
                                        </button>
                                        <button onClick={startStudySession} disabled={!canProceed()} className="flex items-center justify-center bg-accent text-white font-bold py-3 px-6 rounded-lg border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2 disabled:bg-slate-500 disabled:border-slate-500 disabled:cursor-not-allowed transition-colors">
                                            <BrainIcon className="w-5 h-5 mr-2" /> Start Studying
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudyPage;