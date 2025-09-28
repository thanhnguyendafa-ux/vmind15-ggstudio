import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Relation } from '../types';
import { useNavigate } from 'react-router-dom';

const FlashcardsPage: React.FC = () => {
    const { tables, relations, loading } = useData();
    const navigate = useNavigate();

    const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
    const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);

    const flashcardStats = useMemo(() => {
        const stats = { Hard: 0, Good: 0, Easy: 0 };
        if (!tables) return stats;
        tables.forEach(table => {
            table.rows.forEach(row => {
                const status = row.stats.flashcardStatus;
                if (status === 'Hard') stats.Hard++;
                else if (status === 'Good') stats.Good++;
                else if (status === 'Easy') stats.Easy++;
            });
        });
        return stats;
    }, [tables]);

    const availableRelations = useMemo(() => {
        if (selectedTableIds.length === 0) return [];
        return relations.filter(r => selectedTableIds.includes(r.tableId));
    }, [relations, selectedTableIds]);

    const handleTableToggle = (tableId: string) => {
        setSelectedTableIds(prev => {
            const newSelection = prev.includes(tableId)
                ? prev.filter(id => id !== tableId)
                : [...prev, tableId];
            
            // Filter out relations that are no longer in selected tables
            setSelectedRelationIds(currentRelIds => 
                currentRelIds.filter(relId => {
                    const relation = relations.find(r => r.id === relId);
                    return relation && newSelection.includes(relation.tableId);
                })
            );

            return newSelection;
        });
    };

    const handleRelationToggle = (relId: string) => {
        setSelectedRelationIds(prev =>
            prev.includes(relId) ? prev.filter(id => id !== relId) : [...prev, relId]
        );
    };
    
    const canStart = selectedTableIds.length > 0 && selectedRelationIds.length > 0;

    const startSession = () => {
        if (!canStart) return;
        const words = tables
            .filter(t => selectedTableIds.includes(t.id))
            .flatMap(t => t.rows);

        if (words.length === 0) {
            alert("Selected tables have no words to study.");
            return;
        }

        navigate('/flashcards-session', {
            state: {
                words,
                relationIds: selectedRelationIds,
            }
        });
    };

    if (loading) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-text-primary">Setup Flashcards</h1>
            
            <section className="mb-8 p-4 bg-secondary rounded-lg">
                <h2 className="text-xl font-semibold text-accent mb-4">Flashcard Stats</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-3xl font-bold text-red-400">{flashcardStats.Hard}</p>
                        <p className="text-sm text-text-secondary">Hard</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-yellow-400">{flashcardStats.Good}</p>
                        <p className="text-sm text-text-secondary">Good</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-green-400">{flashcardStats.Easy}</p>
                        <p className="text-sm text-text-secondary">Easy</p>
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold text-accent mb-4">1. Select Tables</h2>
                <div className="space-y-2">
                    {tables.map(table => (
                        <label key={table.id} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedTableIds.includes(table.id) ? 'bg-accent text-primary font-bold' : 'bg-secondary'}`}>
                            <input type="checkbox" checked={selectedTableIds.includes(table.id)} onChange={() => handleTableToggle(table.id)} className="mr-3 h-5 w-5 rounded accent-primary" />
                            {table.name} ({table.rows.length} words)
                        </label>
                    ))}
                </div>
            </section>

            {selectedTableIds.length > 0 && (
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-accent mb-4">2. Select Relations</h2>
                    <p className="text-sm text-text-secondary mb-3">If you choose more than one, a relation will be chosen randomly for each card.</p>
                    <div className="space-y-2">
                        {availableRelations.length > 0 ? availableRelations.map(rel => (
                             <label key={rel.id} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${selectedRelationIds.includes(rel.id) ? 'bg-accent text-primary font-bold' : 'bg-secondary'}`}>
                                <input type="checkbox" checked={selectedRelationIds.includes(rel.id)} onChange={() => handleRelationToggle(rel.id)} className="mr-3 h-5 w-5 rounded accent-primary" />
                                <div>
                                    <span className="font-semibold">{tables.find(t => t.id === rel.tableId)?.name}</span>: {rel.name}
                                </div>
                            </label>
                        )) : (
                            <p className="text-text-secondary">No relations available for the selected tables.</p>
                        )}
                    </div>
                </section>
            )}

            <button
                onClick={startSession}
                disabled={!canStart}
                className="w-full bg-accent text-primary font-bold py-3 px-6 rounded-lg text-lg disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors"
            >
                Start Flashcards
            </button>
        </div>
    );
};

export default FlashcardsPage;