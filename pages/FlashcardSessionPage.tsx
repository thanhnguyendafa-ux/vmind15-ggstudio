
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { VocabRow, Relation, VocabRowStats } from '../types';
import { useData } from '../hooks/useData';
import { dataService } from '../services/dataService';
import { CheckCircleIcon, XCircleIcon } from '../components/Icons';

type FlashcardStatus = VocabRowStats['flashcardStatus'];
interface DeckItem {
    word: VocabRow;
    relation: Relation;
}

const getDisplayValue = (word: VocabRow, col: string) => {
    if (col === 'keyword') return word.keyword;
    return word.data[col] || '';
};

const Flashcard: React.FC<{ item: DeckItem, isFlipped: boolean, onFlip: () => void }> = ({ item, isFlipped, onFlip }) => {
    const status = item.word.stats.flashcardStatus;
    const statusColor = useMemo(() => ({
        'Hard': 'bg-red-500',
        'Good': 'bg-yellow-500',
        'Easy': 'bg-green-500',
        'None': 'bg-slate-500'
    }[status]), [status]);

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
                {/* Card Status Indicator */}
                <div className={`absolute top-4 left-4 w-4 h-4 rounded-full ${statusColor}`} title={`Status: ${status}`}></div>
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
    const [deckStats, setDeckStats] = useState({ Hard: 0, Good: 0, Easy: 0, None: 0 });
    const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string } | null>(null);

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
            return { word, relation };
        }).filter((item): item is DeckItem => item !== null);

        initialDeck.sort(() => Math.random() - 0.5);

        setDeck(initialDeck);
        setInitialDeckSize(initialDeck.length);
        
        const stats = { Hard: 0, Good: 0, Easy: 0, None: 0 };
        words.forEach(word => {
            stats[word.stats.flashcardStatus || 'None']++;
        });
        setDeckStats(stats);

    }, [words, relationIds, relations, navigate]);
    
    const currentItem = deck.length > 0 ? deck[0] : null;

    const handleFlip = () => {
        if(!currentItem || isUpdating || feedback?.show) return;
        setIsFlipped(prev => !prev);
    };
    
    const handleEndSession = () => {
        fetchData();
        navigate('/flashcards');
    };
    
    const handleAnswer = async (correct: boolean) => {
        if (!currentItem || isUpdating || !isFlipped) return;
        setIsUpdating(true);

        const oldStatus = currentItem.word.stats.flashcardStatus;
        let newStatus: FlashcardStatus;
        let feedbackMessage = '';

        if (correct) {
            if (oldStatus === 'Good' || oldStatus === 'Easy') {
                newStatus = 'Easy';
                feedbackMessage = "Excellent! Marked as Easy.";
            } else {
                newStatus = 'Good';
                feedbackMessage = "Great! Marked as Good.";
            }
        } else {
            newStatus = 'Hard';
            feedbackMessage = "Marked as Hard. You'll see this again soon!";
        }

        setFeedback({ show: true, correct, message: feedbackMessage });

        await dataService.updateFlashcardStatus(currentItem.word.tableId, currentItem.word.id, newStatus);
        
        setDeckStats(prev => {
            const newStats = { ...prev };
            newStats[oldStatus]--;
            newStats[newStatus]++;
            return newStats;
        });

        setTimeout(() => {
            let nextDeck = [...deck];
            const itemToMove = nextDeck.shift()!;
            
            const updatedItem: DeckItem = {
                ...itemToMove,
                word: {
                    ...itemToMove.word,
                    stats: {
                        ...itemToMove.word.stats,
                        flashcardStatus: newStatus,
                    },
                },
            };

            if (correct) {
                if (newStatus === 'Easy') {
                    nextDeck.push(updatedItem);
                } else { // 'Good'
                    nextDeck.splice(Math.min(8, nextDeck.length), 0, updatedItem);
                }
            } else { // 'Hard'
                nextDeck.splice(Math.min(2, nextDeck.length), 0, updatedItem);
            }
            
            setDeck(nextDeck);
            setIsFlipped(false);
            setFeedback(null);
            setIsUpdating(false);
        }, 1500);
    };

    const handleReset = () => {
        if (!words || !relationIds) {
            navigate('/flashcards');
            return;
        }
        const sessionRelations = relations.filter(r => relationIds.includes(r.id));
        const initialDeck = words.map(word => {
            const applicableRelations = sessionRelations.filter(r => r.tableId === word.tableId);
            if(applicableRelations.length === 0) return null;
            const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
            return { word, relation };
        }).filter((item): item is DeckItem => item !== null);
        initialDeck.sort(() => Math.random() - 0.5);
        setDeck(initialDeck);
        setIsFlipped(false);
    };

    // FIX: Explicitly cast Object.values to number[] to correct a type inference issue where
    // the arguments in `reduce` were being inferred as `unknown`.
    const totalStats = useMemo(() => (Object.values(deckStats) as number[]).reduce((a, b) => a + b, 0) || 1, [deckStats]);
    
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
                            Deck Health ({initialDeckSize} cards)
                        </p>
                        {/* Dynamic "Deck Health" Bar */}
                        <div className="flex h-2 mt-2 bg-slate-700 rounded-full w-full overflow-hidden">
                            <div className="bg-red-500 transition-all duration-300" style={{ width: `${(deckStats.Hard / totalStats) * 100}%` }} title={`${deckStats.Hard} Hard`}></div>
                            <div className="bg-yellow-500 transition-all duration-300" style={{ width: `${(deckStats.Good / totalStats) * 100}%` }} title={`${deckStats.Good} Good`}></div>
                            <div className="bg-green-500 transition-all duration-300" style={{ width: `${(deckStats.Easy / totalStats) * 100}%` }} title={`${deckStats.Easy} Easy`}></div>
                            <div className="bg-slate-500 transition-all duration-300" style={{ width: `${(deckStats.None / totalStats) * 100}%` }} title={`${deckStats.None} New`}></div>
                        </div>
                    </>
                )}
            </header>

            <main 
                className="flex-grow flex flex-col items-center justify-center w-full relative"
                style={{ perspective: '1000px' }}
            >
                 {feedback?.show && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-xl z-20 transition-opacity duration-300">
                        {feedback.correct ? (
                            <CheckCircleIcon className="w-24 h-24 text-green-400" />
                        ) : (
                            <XCircleIcon className="w-24 h-24 text-red-400" />
                        )}
                        <p className="mt-4 text-lg font-semibold text-white bg-black/50 px-4 py-2 rounded-md">{feedback.message}</p>
                    </div>
                )}
                {currentItem ? (
                    <>
                        <Flashcard item={currentItem} isFlipped={isFlipped} onFlip={handleFlip} />
                        
                        <div className="mt-8 w-full max-w-2xl flex justify-around">
                            {isFlipped ? (
                                <>
                                    <button onClick={() => handleAnswer(false)} disabled={isUpdating} className="bg-red-500 text-white font-bold py-4 px-6 rounded-lg text-lg w-2/5 shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-wait">
                                        I Don't Know
                                    </button>
                                     <button onClick={() => handleAnswer(true)} disabled={isUpdating} className="bg-green-500 text-white font-bold py-4 px-6 rounded-lg text-lg w-2/5 shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-wait">
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