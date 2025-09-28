
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { VocabRow, Relation, VocabRowStats } from '../types';
import { useData } from '../hooks/useData';
import { dataService } from '../services/dataService';

type FlashcardStatus = VocabRowStats['flashcardStatus'];
interface DeckItem {
    word: VocabRow;
    relation: Relation;
    status: FlashcardStatus;
}

const getDisplayValue = (word: VocabRow, col: string) => {
    if (col === 'keyword') return word.keyword;
    return word.data[col] || '';
};

const Flashcard: React.FC<{ item: DeckItem, isFlipped: boolean, onFlip: () => void }> = ({ item, isFlipped, onFlip }) => {
    const question = useMemo(() => (
        item.relation.questionCols.map(col => (
            <div key={col}>
                <span className="font-normal text-text-secondary text-base">{col.charAt(0).toUpperCase() + col.slice(1)}: </span>
                {getDisplayValue(item.word, col)}
            </div>
        ))
    ), [item]);

    const answer = useMemo(() => (
        item.relation.answerCols.map(col => (
            <div key={col}>
                <span className="font-normal text-text-secondary text-base">{col.charAt(0).toUpperCase() + col.slice(1)}: </span>
                {getDisplayValue(item.word, col)}
            </div>
        ))
    ), [item]);

    return (
        <div 
            className="w-full max-w-2xl h-80 rounded-xl shadow-lg cursor-pointer flex items-center justify-center p-6 text-center transition-transform duration-700"
            onClick={onFlip}
            style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
            <div 
                className="absolute w-full h-full bg-secondary rounded-xl flex flex-col items-center justify-center p-6"
                style={{ backfaceVisibility: 'hidden' }}
            >
                <p className="text-sm text-text-secondary mb-2">Question</p>
                <div className="text-2xl font-bold text-text-primary">{question}</div>
            </div>
             <div 
                className="absolute w-full h-full bg-accent rounded-xl flex flex-col items-center justify-center p-6" 
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
             >
                <p className="text-sm text-slate-800 mb-2">Answer</p>
                <div className="text-2xl font-bold text-primary">{answer}</div>
            </div>
        </div>
    )
}

const FlashcardSessionPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { relations, fetchData } = useData();

    const { words, relationIds } = (location.state || {}) as { words?: VocabRow[], relationIds?: string[] };

    const [deck, setDeck] = useState<DeckItem[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [initialDeckSize, setInitialDeckSize] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!words || !relationIds) {
            navigate('/flashcards');
            return;
        }

        const sessionRelations = relations.filter(r => relationIds.includes(r.id));

        const initialDeck = words.map(word => {
            const applicableRelations = sessionRelations.filter(r => r.tableId === word.tableId);
            if(applicableRelations.length === 0) return null;
            const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
            return { word, relation, status: word.stats.flashcardStatus || 'None' };
        }).filter((item): item is DeckItem => item !== null); // Ensure we have a relation and filter out nulls

        // Shuffle the deck
        initialDeck.sort(() => Math.random() - 0.5);

        setDeck(initialDeck);
        setInitialDeckSize(initialDeck.length);
    }, [words, relationIds, relations, navigate]);
    
    const currentItem = deck.length > 0 ? deck[0] : null;

    const handleFlip = () => {
        if(!currentItem) return;
        setIsFlipped(prev => !prev);
    };
    
    const handleEndSession = () => {
        fetchData(); // Refresh data context to show updated stats on setup page
        navigate('/flashcards');
    };

    const handleIKnow = async () => {
        if (!currentItem || isUpdating) return;
        setIsUpdating(true);

        const currentStatus = currentItem.status;
        let nextStatus: 'Good' | 'Easy' = 'Good';
        let nextDeck = [...deck];
        const knownItem = nextDeck.shift();
        
        if (!knownItem) {
            setIsUpdating(false);
            return;
        }

        if (currentStatus === 'Good' || currentStatus === 'Easy') {
            nextStatus = 'Easy';
            // Send to tail
            const newItem: DeckItem = { ...knownItem, status: nextStatus };
            nextDeck.push(newItem);
        } else { // 'None' or 'Hard'
            nextStatus = 'Good';
            const newItem: DeckItem = { ...knownItem, status: nextStatus };
            // insert at y+8
            if (nextDeck.length >= 8) {
                nextDeck.splice(8, 0, newItem);
            } else {
                nextDeck.push(newItem);
            }
        }

        await dataService.updateFlashcardStatus(currentItem.word.tableId, currentItem.word.id, nextStatus);
        
        setDeck(nextDeck);
        setIsFlipped(false);
        setIsUpdating(false);
    };
    
    const handleIDontKnow = async () => {
        if (!currentItem || isUpdating) return;
        setIsUpdating(true);
        
        const nextStatus = 'Hard';
        let nextDeck = [...deck];
        const unknownItem = nextDeck.shift();

        if (!unknownItem) {
            setIsUpdating(false);
            return;
        }

        const newItem: DeckItem = { ...unknownItem, status: nextStatus };

        // insert at y+2
        if (nextDeck.length >= 2) {
            nextDeck.splice(2, 0, newItem);
        } else {
            nextDeck.push(newItem);
        }

        await dataService.updateFlashcardStatus(currentItem.word.tableId, currentItem.word.id, nextStatus);

        setDeck(nextDeck);
        setIsFlipped(false);
        setIsUpdating(false);
    };

    const handleReset = () => {
        // Just re-run the effect
         if (!words || !relationIds) {
            navigate('/flashcards');
            return;
        }
        const sessionRelations = relations.filter(r => relationIds.includes(r.id));
        const initialDeck = words.map(word => {
            const applicableRelations = sessionRelations.filter(r => r.tableId === word.tableId);
            if(applicableRelations.length === 0) return null;
            const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
            return { word, relation, status: word.stats.flashcardStatus || 'None' };
        }).filter((item): item is DeckItem => item !== null);
        initialDeck.sort(() => Math.random() - 0.5);
        setDeck(initialDeck);
        setIsFlipped(false);
    };
    
    if (!location.state) {
        return <div className="p-4 text-center">Loading session...</div>
    }

    return (
        <div className="p-4 sm:p-6 flex flex-col items-center h-screen">
            <header className="w-full max-w-2xl mb-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Flashcards</h2>
                    <button onClick={handleEndSession} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">End Session</button>
                </div>
                {initialDeckSize > 0 && (
                    <>
                    <p className="text-text-secondary mt-2 text-center">
                        Cards remaining: {deck.length} / {initialDeckSize}
                    </p>
                    <div className="h-2 mt-2 bg-slate-700 rounded-full w-full">
                        <div className="bg-accent h-2 rounded-full" style={{ width: `${(initialDeckSize - deck.length) / initialDeckSize * 100}%` }}></div>
                    </div>
                    </>
                )}
            </header>

            <main 
                className="flex-grow flex flex-col items-center justify-center w-full"
                style={{ perspective: '1000px' }}
            >
                {currentItem ? (
                    <>
                        <Flashcard item={currentItem} isFlipped={isFlipped} onFlip={handleFlip} />
                        
                        <div className="mt-8 w-full max-w-2xl flex justify-around">
                            {isFlipped ? (
                                <>
                                    <button onClick={handleIDontKnow} disabled={isUpdating} className="bg-red-500 text-white font-bold py-4 px-6 rounded-lg text-lg w-2/5 shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-wait">
                                        I Don't Know
                                    </button>
                                     <button onClick={handleIKnow} disabled={isUpdating} className="bg-green-500 text-white font-bold py-4 px-6 rounded-lg text-lg w-2/5 shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-wait">
                                        I Know
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleFlip} className="bg-accent text-primary font-bold py-4 px-6 rounded-lg text-lg w-full shadow-lg transform hover:scale-105 transition-transform">
                                    Flip Card
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-green-400 mb-4">Deck Complete!</h2>
                        <p className="text-text-secondary mb-6">You've gone through all the cards.</p>
                        <div className="flex space-x-4">
                             <button onClick={handleReset} className="bg-accent text-primary font-bold py-3 px-6 rounded-lg text-lg">
                                Study Again
                            </button>
                             <button onClick={handleEndSession} className="bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-3 px-6 rounded-lg text-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                Back to Setup
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FlashcardSessionPage;
