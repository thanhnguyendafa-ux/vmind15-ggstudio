import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StudyConfig, VocabRow, Relation, StudyMode, VocabTable, WordProgress, WordStatus } from '../types';
import { useData } from '../hooks/useData';
import { dataService } from '../services/dataService';
import { XIcon } from '../components/Icons';

interface QueueItem {
    word: VocabRow;
    relation: Relation;
    mode: StudyMode;
}

interface TFStatement {
    questionParts: { col: string, value: string }[];
    answerPart: { col: string, value: string };
    isCorrect: boolean;
}

const getDisplayValue = (word: VocabRow, col: string) => {
    if (col === 'keyword') return word.keyword;
    return word.data[col] || '';
};

const getAnswerForWord = (word: VocabRow, relation: Relation): string => {
    return relation.answerCols.map(col => getDisplayValue(word, col)).join(' / ');
};

const FullExplanationModal: React.FC<{
    word: VocabRow;
    table: VocabTable;
    onContinue: () => void;
}> = ({ word, table, onContinue }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">Full Explanation for: <span className="text-text-primary">{word.keyword}</span></h3>
            <div className="overflow-y-auto space-y-2 bg-primary p-3 rounded-md">
                <div className="flex justify-between">
                    <span className="font-semibold text-text-secondary">Keyword:</span>
                    <span className="text-text-primary">{word.keyword}</span>
                </div>
                {/* FIX: Use col.name for key, display, and data access, as 'col' is an object. */}
                {table.columns.map(col => (
                    <div key={col.name} className="flex justify-between">
                        <span className="font-semibold text-text-secondary">{col.name}:</span>
                        <span className="text-text-primary text-right">{word.data[col.name] || '-'}</span>
                    </div>
                ))}
                <div className="pt-2 border-t border-slate-600 mt-2">
                    <div className="flex justify-between">
                        <span className="font-semibold text-text-secondary">Rank Point:</span>
                        <span className="text-text-primary">{word.stats.RankPoint}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold text-text-secondary">Success Rate:</span>
                        <span className="text-text-primary">{(word.stats.SuccessRate * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={onContinue} className="bg-accent text-primary font-bold py-2 px-6 rounded-lg">
                    Continue
                </button>
            </div>
        </div>
    </div>
);


const QStudyPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { tables, relations, fetchData } = useData();

    const config = location.state as StudyConfig;

    const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({});
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isRevealed, setIsRevealed] = useState(false);
    const [userAnswer, setUserAnswer] = useState('');
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
    const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
    const [mcqOptions, setMcqOptions] = useState<string[]>([]);
    const [tfStatement, setTfStatement] = useState<TFStatement | null>(null);
    const [isCommitting, setIsCommitting] = useState(false);
    const [showKeywordsInTracker, setShowKeywordsInTracker] = useState(false);
    const [speedMode, setSpeedMode] = useState(false);
    const [showFullExplanation, setShowFullExplanation] = useState(false);


    useEffect(() => {
        if (!config || !config.words) {
            navigate('/study');
            return;
        }
        
        const initialProgress = config.words.reduce((acc, word) => {
            acc[word.id] = { status: 'untouched', newFails: 0, newPasses: 0 };
            return acc;
        }, {} as Record<string, WordProgress>);
        setWordProgress(initialProgress);

        const sessionWords = [...config.words].sort(() => 0.5 - Math.random());
        const initialQueue: QueueItem[] = [];
        
        const sessionRelations = relations.filter(r => config.relationIds.includes(r.id));

        if (!config.useRandomRelation && sessionRelations.length > 1) {
            // Ensure each selected relation is used at least once
            const usedRelationIds = new Set<string>();
            const relationQueue = [...sessionRelations];

            for (const word of sessionWords) {
                if(relationQueue.length === 0) break;
                const rel = relationQueue.shift()!;
                const applicableModes = rel.modes.filter(m => config.modes.includes(m));
                if (applicableModes.length > 0) {
                     initialQueue.push({
                        word,
                        relation: rel,
                        mode: applicableModes[Math.floor(Math.random() * applicableModes.length)]
                     });
                     usedRelationIds.add(word.id);
                }
            }

            // Add remaining words
            sessionWords.forEach(word => {
                if (usedRelationIds.has(word.id)) return;
                const applicableRelations = sessionRelations.filter(r => r.tableId === word.tableId);
                if (applicableRelations.length > 0) {
                    const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
                    const mode = relation.modes.filter(m => config.modes.includes(m))[0] || relation.modes[0];
                    initialQueue.push({ word, relation, mode });
                }
            });

        } else {
             // Default random logic
             sessionWords.forEach(word => {
                const applicableRelations = relations.filter(r => 
                    (config.relationIds.includes(r.id) || config.useRandomRelation) && 
                    r.tableId === word.tableId && 
                    (config.modes.length === 0 || r.modes.some(m => config.modes.includes(m)))
                );
                if (applicableRelations.length > 0) {
                    const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
                    const applicableModes = relation.modes.filter(m => config.modes.includes(m));
                    const mode = applicableModes.length > 0
                        ? applicableModes[Math.floor(Math.random() * applicableModes.length)]
                        : relation.modes[Math.floor(Math.random() * relation.modes.length)];

                    initialQueue.push({ word, relation, mode });
                }
            });
        }
        setQueue(initialQueue);
        
    }, [config, navigate, relations]);
    
    const currentItem = queue.length > 0 ? queue[0] : null;
    
    useEffect(() => {
        if (!currentItem) return;

        if (currentItem.mode === StudyMode.MCQ) {
            const correctAnswer = getAnswerForWord(currentItem.word, currentItem.relation);
            const distractors = config.words
                .filter(w => w.id !== currentItem.word.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
                .map(w => {
                     const randomRelation = relations.find(r => r.tableId === w.tableId && r.answerCols.toString() === currentItem.relation.answerCols.toString()) || currentItem.relation;
                     return getAnswerForWord(w, randomRelation);
                });
            const allOptions = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
            setMcqOptions(allOptions);
        } else if (currentItem.mode === StudyMode.TF) {
            const isCorrect = Math.random() > 0.5;
            let answerWord = currentItem.word;
            if (!isCorrect) {
                 const distractors = config.words.filter(w => w.id !== currentItem.word.id);
                 if(distractors.length > 0) {
                    answerWord = distractors[Math.floor(Math.random() * distractors.length)];
                 }
            }
            const answerCol = currentItem.relation.answerCols[Math.floor(Math.random() * currentItem.relation.answerCols.length)];
            setTfStatement({
                questionParts: currentItem.relation.questionCols.map(col => ({ col, value: getDisplayValue(currentItem.word, col) })),
                answerPart: { col: answerCol, value: getDisplayValue(answerWord, answerCol) },
                isCorrect
            });
        }
    }, [currentItem, config.words, relations]);


    const advanceQueue = useCallback((isCorrect: boolean) => {
        if (!currentItem) return;
        const currentWordId = currentItem.word.id;
        const currentStatus = wordProgress[currentWordId].status;

        let nextQueue = [...queue];
        const itemToMove = nextQueue.shift()!;
        
        if (isCorrect) {
            if (currentStatus === 'untouched' || currentStatus === 'fail') {
                setWordProgress(prev => ({ ...prev, [currentWordId]: { ...prev[currentWordId], status: 'pass1', newPasses: prev[currentWordId].newPasses + 1 } }));
                nextQueue.push(itemToMove);
            } else if (currentStatus === 'pass1') {
                 setWordProgress(prev => ({ ...prev, [currentWordId]: { ...prev[currentWordId], status: 'pass2', newPasses: prev[currentWordId].newPasses + 1 } }));
            }
        } else {
            setWordProgress(prev => ({ ...prev, [currentWordId]: { ...prev[currentWordId], status: 'fail', newFails: prev[currentWordId].newFails + 1 } }));
            nextQueue.splice(2, 0, itemToMove);
        }
        
        setQueue(nextQueue);
        setIsRevealed(false);
        setLastAnswerCorrect(null);
        setUserAnswer('');
        setTfStatement(null);
        setShowFullExplanation(false);
    }, [currentItem, queue, wordProgress]);

    const handleAnswer = (isCorrect: boolean) => {
        if (!currentItem || isRevealed) return;

        setLastAnswerCorrect(isCorrect);
        setIsRevealed(true);

        if (speedMode) {
            setTimeout(() => advanceQueue(isCorrect), 800);
        } else {
            if (isCorrect) {
                setTimeout(() => advanceQueue(isCorrect), 1500);
            } else {
                // Incorrect in normal mode: just show the full explanation.
                // The user will click "Continue" which triggers the next step.
                setShowFullExplanation(true);
            }
        }
    };
    
    const handleExplanationContinue = () => {
        // When the user dismisses the explanation, we advance the queue
        // with an "incorrect" result. advanceQueue handles all state updates.
        advanceQueue(false);
    };

    const checkTypingAnswer = () => {
        if (!currentItem) return;
        const correctAnswer = getAnswerForWord(currentItem.word, currentItem.relation);
        handleAnswer(userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase());
    }
    
    const handleQuit = async () => {
        setIsCommitting(true);
        await dataService.updateStatsOnQuit(config, wordProgress);
        await fetchData(); // Refresh global state
        navigate('/');
    };
    
    const handleCompletion = useCallback(async () => {
        setIsCommitting(true);
        await dataService.updateStatsOnCompletion(config, wordProgress);
        await fetchData(); // Refresh global state
    }, [config, wordProgress, fetchData]);


    const allWordsPassed = useMemo(() => 
        Object.keys(wordProgress).length > 0 && Object.values(wordProgress).every((p: WordProgress) => p.status === 'pass2'),
    [wordProgress]);
    
    useEffect(() => {
        if (allWordsPassed && queue.length === 0 && !isCommitting) {
            handleCompletion();
        }
    }, [allWordsPassed, queue.length, isCommitting, handleCompletion]);

    useEffect(() => {
        // This function will be called when the user navigates away or closes the tab.
        // It's more reliable for saving state than 'beforeunload'.
        const handlePageHide = (event: PageTransitionEvent) => {
            // `!event.persisted` is a check to ensure the page is actually being unloaded,
            // not just put into the back-forward cache.
            if (!event.persisted && !allWordsPassed && !isCommitting) {
                // This is a "fire and forget" call. We can't await it during page unload.
                // In a real application with a backend, this would use `navigator.sendBeacon()`.
                // In our mock environment, this schedules the updates which should
                // complete before the JavaScript context is destroyed.
                dataService.updateStatsOnQuit(config, wordProgress);
            }
        };

        window.addEventListener('pagehide', handlePageHide);

        // The 'beforeunload' event is still needed to show the confirmation prompt to the user.
        // This gives them a chance to cancel leaving the page.
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!allWordsPassed) {
                event.preventDefault();
                // Required for cross-browser compatibility to trigger the prompt.
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup the event listeners when the component unmounts or the dependencies change.
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [allWordsPassed, isCommitting, config, wordProgress]);


    const displayWords = useMemo(() => {
        const wordsInQueue = queue.map(item => item.word);
        const queueWordIds = new Set(wordsInQueue.map(w => w.id));
    
        const completedWords = config.words
            .filter(word => {
                const progress = wordProgress[word.id];
                return progress?.status === 'pass2' && !queueWordIds.has(word.id);
            })
            .sort((a, b) => a.keyword.localeCompare(b.keyword));
    
        return [...wordsInQueue, ...completedWords];
    }, [queue, config.words, wordProgress]);

    if (!config || !config.words) return <div className="p-4">Loading session...</div>;

    if (allWordsPassed && isCommitting) {
         return (
             <div className="flex flex-col items-center justify-center h-screen bg-primary text-text-primary p-4">
                <h1 className="text-4xl font-bold text-green-400 mb-4">Session Complete!</h1>
                <p className="text-xl mb-8">Great work! Your progress has been saved.</p>
                 <button onClick={() => navigate('/')} className="bg-accent text-primary font-bold py-3 px-8 rounded-lg text-lg">
                    Back to Home
                </button>
            </div>
        )
    }
    
    const currentTable = currentItem ? tables.find(t => t.id === currentItem.word.tableId) : null;

    return (
        <div className="p-4 sm:p-6 flex flex-col h-screen">
            {isQuitModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-secondary p-6 rounded-lg shadow-xl max-w-sm w-full">
                        <h3 className="text-xl font-bold text-red-400 mb-4">Quit Session?</h3>
                        <p className="text-text-secondary mb-6">
                            Your progress in this session will not be saved. Words you haven't fully learned will be marked to be prioritized in future sessions.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setIsQuitModalOpen(false)} className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors font-semibold py-2 px-4 rounded-lg">
                                Cancel
                            </button>
                            <button 
                                onClick={handleQuit} 
                                disabled={isCommitting}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-red-800">
                                {isCommitting ? 'Quitting...' : 'Confirm Quit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
             {showFullExplanation && currentItem && currentTable && (
                <FullExplanationModal 
                    word={currentItem.word}
                    table={currentTable}
                    onContinue={handleExplanationContinue}
                />
            )}
            <header className="mb-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                   <h2 className="text-xl font-bold">Study Session</h2>
                    <div className="flex items-center gap-2">
                         <label htmlFor="speed-mode-toggle" className="flex items-center cursor-pointer">
                            <span className="mr-2 text-sm text-text-secondary">Speed Mode</span>
                            <div className="relative">
                                <input type="checkbox" id="speed-mode-toggle" className="sr-only" checked={speedMode} onChange={() => setSpeedMode(p => !p)} />
                                <div className={`block w-10 h-6 rounded-full ${speedMode ? 'bg-accent' : 'bg-slate-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${speedMode ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                        <button
                            onClick={() => setShowKeywordsInTracker(p => !p)}
                            className="text-sm bg-secondary dark:bg-slate-700 text-text-secondary dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1 rounded-md"
                            aria-pressed={showKeywordsInTracker}
                        >
                            {showKeywordsInTracker ? 'Hide' : 'Show'} Words
                        </button>
                        <button onClick={() => setIsQuitModalOpen(true)} className="bg-red-500 text-white px-3 py-1 rounded">Quit</button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-4">
                    {displayWords.map((word, index) => {
                        const progress = wordProgress[word.id];
                        if (!progress) return null;
                        
                        const isCurrent = index === 0 && queue.length > 0 && progress.status !== 'pass2';

                        let color = 'bg-secondary border-slate-600';
                        let statusContent: React.ReactNode = <>&nbsp;</>;

                        if (isCurrent) {
                            color = 'bg-red-900 border-red-700';
                        } else if (progress.status === 'pass2') {
                            color = 'bg-green-900/50 border-green-700 text-green-300';
                        }
                        
                        if (progress.status === 'fail') {
                            statusContent = '🔴';
                        } else if (progress.status === 'pass1') {
                            statusContent = '🟡';
                        } else if (progress.status === 'pass2') {
                            statusContent = '🟢';
                        }
                        
                        return (
                            <div 
                                key={word.id} 
                                className={`flex-1 p-1 rounded-md border text-xs text-center transition-all duration-300 ${color}`}
                                style={{minWidth: '50px'}}
                                title={word.keyword}
                            >
                                <div className="truncate h-5 flex items-center justify-center font-mono">
                                    {showKeywordsInTracker ? word.keyword : statusContent}
                                </div>
                            </div>
                        )
                    })}
                </div>
                 <div className="h-1 mt-2 bg-slate-700 rounded-full">
                    <div className="bg-accent h-1 rounded-full" style={{ width: `${Object.values(wordProgress).filter(p => p.status === 'pass2').length / config.words.length * 100}%` }}></div>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center bg-secondary rounded-lg p-4">
                {currentItem ? (
                    <div className="w-full max-w-md text-center">
                        <div className="mb-8">
                            <p className="text-sm text-text-secondary mb-2">{currentItem.relation.name}</p>
                            {currentItem.relation.questionCols.map(col => (
                                <p key={col} className="text-3xl font-bold text-text-primary">
                                    <span className="font-normal text-text-secondary">{col.charAt(0).toUpperCase() + col.slice(1)}: </span>
                                    {getDisplayValue(currentItem.word, col)}
                                </p>
                            ))}
                        </div>
                        
                        {!isRevealed ? (
                             <>
                                {currentItem.mode === StudyMode.Typing && (
                                    <div className="flex flex-col items-center">
                                        <input 
                                            type="text"
                                            value={userAnswer}
                                            onChange={(e) => setUserAnswer(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && checkTypingAnswer()}
                                            className="bg-primary text-text-primary text-lg p-3 rounded-md w-full mb-4 text-center"
                                            placeholder="Type your answer..."
                                            autoFocus
                                        />
                                        <button onClick={checkTypingAnswer} className="bg-accent text-primary font-bold py-3 px-8 rounded-lg text-lg w-full">Submit</button>
                                    </div>
                                )}
                                {currentItem.mode === StudyMode.MCQ && (
                                    <div className="space-y-3 w-full">
                                        {mcqOptions.map((option, index) => {
                                            const isCorrect = option === getAnswerForWord(currentItem.word, currentItem.relation);
                                            return (
                                                <button 
                                                    key={`${currentItem.word.id}-${index}`}
                                                    onClick={() => handleAnswer(isCorrect)} 
                                                    className="bg-primary dark:bg-slate-600 text-text-primary dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 w-full p-4 rounded-lg text-lg text-left transition-colors"
                                                >
                                                    {option}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                                {currentItem.mode === StudyMode.TF && tfStatement && (
                                    <div className="w-full">
                                        <div className="bg-primary p-4 rounded-lg mb-6">
                                            <p className="text-2xl font-bold text-text-primary">
                                                <span className="font-normal text-text-secondary">{tfStatement.answerPart.col.charAt(0).toUpperCase() + tfStatement.answerPart.col.slice(1)}: </span>
                                                {tfStatement.answerPart.value}
                                            </p>
                                        </div>
                                        <div className="flex justify-around">
                                            <button onClick={() => handleAnswer(tfStatement.isCorrect)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg text-xl w-5/12">True</button>
                                            <button onClick={() => handleAnswer(!tfStatement.isCorrect)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg text-xl w-5/12">False</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                             <div className={`p-4 rounded-lg ${lastAnswerCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                <p className="text-2xl font-bold">{lastAnswerCorrect ? 'Correct!' : 'Incorrect'}</p>
                                {!lastAnswerCorrect && (
                                    <p className="mt-2 text-text-primary">
                                        The correct answer is:
                                        {currentItem.relation.answerCols.map(col => (
                                            <span key={col} className="block">
                                                <span className="font-bold">{col.charAt(0).toUpperCase() + col.slice(1)}: </span>
                                                {getDisplayValue(currentItem.word, col)}
                                            </span>
                                        ))}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    !allWordsPassed && <p>Loading next question...</p>
                )}
            </main>
        </div>
    );
};

export default QStudyPage;