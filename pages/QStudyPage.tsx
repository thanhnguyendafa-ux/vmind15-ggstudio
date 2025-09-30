
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StudyConfig, VocabRow, Relation, StudyMode, VocabTable, WordProgress, WordStatus } from '../types';
import { useData } from '../hooks/useData';
import { dataService } from '../services/dataService';
import { XIcon, CheckCircleIcon, TrophyIcon, XCircleIcon } from '../components/Icons';

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 v-modal-container">
        <div className="bg-secondary dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col v-modal-content">
            <h3 className="text-xl font-bold text-danger mb-4">Full Explanation for: <span className="text-text-primary dark:text-slate-200">{word.keyword}</span></h3>
            <div className="overflow-y-auto space-y-2 bg-primary dark:bg-slate-900/50 p-3 rounded-lg">
                <div className="flex justify-between">
                    <span className="font-bold text-text-secondary">Keyword:</span>
                    <span className="text-text-primary dark:text-slate-200">{word.keyword}</span>
                </div>
                {table.columns.map(col => (
                    <div key={col.name} className="flex justify-between">
                        <span className="font-bold text-text-secondary">{col.name}:</span>
                        <span className="text-text-primary dark:text-slate-200 text-right">{word.data[col.name] || '-'}</span>
                    </div>
                ))}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                    <div className="flex justify-between">
                        <span className="font-bold text-text-secondary">Rank Point:</span>
                        <span className="text-text-primary dark:text-slate-200">{word.stats.RankPoint}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold text-text-secondary">Success Rate:</span>
                        <span className="text-text-primary dark:text-slate-200">{(word.stats.SuccessRate * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={onContinue} className="w-full text-lg bg-accent text-white font-bold py-3 px-6 rounded-lg border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2">
                    Continue
                </button>
            </div>
        </div>
    </div>
);

const QueueTracker: React.FC<{
    queue: QueueItem[];
    wordProgress: Record<string, WordProgress>;
}> = ({ queue, wordProgress }) => {
    const getStatusColor = (status: WordStatus) => {
        switch (status) {
            case 'fail':
                return 'bg-danger';
            case 'pass1':
                return 'bg-yellow-400';
            case 'untouched':
            default:
                return 'bg-slate-300 dark:bg-slate-600';
        }
    };

    return (
        <div className="flex justify-center items-center space-x-3 h-6 flex-wrap gap-y-2">
            {queue.map((item, index) => (
                <div 
                    key={`${item.word.id}-${index}`}
                    className={`w-4 h-4 rounded-full transition-colors duration-300 ${getStatusColor(wordProgress[item.word.id]?.status)}`}
                    title={item.word.keyword}
                />
            ))}
        </div>
    );
};

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
    const [showFullExplanation, setShowFullExplanation] = useState(false);
    const [isSpeedModeOn, setIsSpeedModeOn] = useState(false);


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

        setTimeout(() => {
            if (isSpeedModeOn) {
                advanceQueue(isCorrect);
            } else {
                if (isCorrect) {
                    advanceQueue(true);
                } else {
                    setShowFullExplanation(true);
                }
            }
        }, 1500);
    };
    
    const handleExplanationContinue = () => {
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
        Object.keys(wordProgress).length > 0 && (Object.values(wordProgress) as WordProgress[]).every(p => p.status === 'pass2'),
    [wordProgress]);
    
    useEffect(() => {
        if (allWordsPassed && queue.length === 0 && !isCommitting) {
            handleCompletion();
        }
    }, [allWordsPassed, queue.length, isCommitting, handleCompletion]);

    useEffect(() => {
        const handlePageHide = (event: PageTransitionEvent) => {
            if (!event.persisted && !allWordsPassed && !isCommitting) {
                dataService.updateStatsOnQuit(config, wordProgress);
            }
        };
        window.addEventListener('pagehide', handlePageHide);
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!allWordsPassed) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [allWordsPassed, isCommitting, config, wordProgress]);

    if (!config || !config.words) return <div className="p-4">Loading session...</div>;

    if (allWordsPassed && isCommitting) {
         return (
             <div className="fixed inset-0 bg-primary dark:bg-slate-900 flex items-center justify-center p-4 z-50">
                 <div className="text-center celebrate-animation">
                    <TrophyIcon className="w-24 h-24 text-yellow-400 mx-auto animate-pulse" />
                    <h1 className="text-4xl font-black text-accent mt-4">Session Complete!</h1>
                    <p className="text-xl mt-2 text-text-secondary">Great work! Your progress has been saved.</p>
                    <button onClick={() => navigate('/')} className="mt-8 text-lg bg-accent text-white font-bold py-4 px-10 rounded-xl border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2">
                        Continue
                    </button>
                </div>
            </div>
        )
    }
    
    const currentTable = currentItem ? tables.find(t => t.id === currentItem.word.tableId) : null;

    return (
        <div className="flex flex-col h-screen">
            {isQuitModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 v-modal-container">
                    <div className="bg-secondary dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-sm w-full v-modal-content">
                        <h3 className="text-2xl font-bold text-danger mb-4">Quit Session?</h3>
                        <p className="text-text-secondary mb-6">
                            Progress won't be saved, and unlearned words will be prioritized later.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setIsQuitModalOpen(false)} className="bg-slate-200 dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-3 px-5 rounded-lg border-b-4 border-slate-300 dark:border-slate-900 active:translate-y-0.5 active:border-b-2">
                                Stay
                            </button>
                            <button 
                                onClick={handleQuit} 
                                disabled={isCommitting}
                                className="bg-accent text-white font-bold py-3 px-5 rounded-lg border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                                {isCommitting ? 'Quitting...' : 'Quit'}
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
            <header className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsQuitModalOpen(true)} className="text-text-secondary hover:text-text-primary p-2">
                        <XIcon className="w-7 h-7" />
                    </button>
                    <div className="w-full">
                        <QueueTracker queue={queue} wordProgress={wordProgress} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="speed-mode-toggle" className="text-sm font-bold text-text-secondary whitespace-nowrap">Speed Mode</label>
                        <button id="speed-mode-toggle" onClick={() => setIsSpeedModeOn(!isSpeedModeOn)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors`} role="switch" aria-checked={isSpeedModeOn}>
                            <span className={`${isSpeedModeOn ? 'bg-accent' : 'bg-slate-400 dark:bg-slate-600'} absolute h-6 w-11 rounded-full`}></span>
                            <span className={`${isSpeedModeOn ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}></span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col justify-between p-4">
                {currentItem ? (
                    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center flex-grow">
                        <div className="mb-8 text-center">
                            <p className="text-lg font-bold text-text-secondary mb-2">{currentItem.relation.name}</p>
                            {currentItem.relation.questionCols.map(col => (
                                <p key={col} className="text-4xl font-black text-text-primary dark:text-slate-200">
                                    {getDisplayValue(currentItem.word, col)}
                                </p>
                            ))}
                        </div>
                        
                        <div className="w-full">
                            {currentItem.mode === StudyMode.Typing && (
                                <div className="flex flex-col items-center">
                                    <input 
                                        type="text"
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && checkTypingAnswer()}
                                        className="bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 text-lg p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:border-accent dark:focus:border-accent w-full mb-4 text-center focus:outline-none"
                                        placeholder="Type your answer..."
                                        autoFocus
                                        disabled={isRevealed}
                                    />
                                    <button onClick={checkTypingAnswer} disabled={isRevealed} className="w-full text-lg bg-accent text-white font-bold py-3 px-6 rounded-xl border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2 disabled:opacity-50">Check</button>
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
                                                disabled={isRevealed}
                                                className="w-full text-left text-lg font-bold p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-secondary dark:bg-slate-800 text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                            >
                                                {option}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {currentItem.mode === StudyMode.TF && tfStatement && (
                                <div className="w-full">
                                    <div className="bg-secondary dark:bg-slate-800 p-4 rounded-xl mb-6 text-center">
                                        <p className="text-3xl font-black text-text-primary dark:text-slate-200">
                                            {tfStatement.answerPart.value}
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <button onClick={() => handleAnswer(tfStatement.isCorrect)} disabled={isRevealed} className="w-full text-lg bg-accent text-white font-bold py-3 px-6 rounded-xl border-b-4 border-accent-darker active:translate-y-0.5 active:border-b-2 disabled:opacity-50">True</button>
                                        <button onClick={() => handleAnswer(!tfStatement.isCorrect)} disabled={isRevealed} className="w-full text-lg bg-danger text-white font-bold py-3 px-6 rounded-xl border-b-4 border-red-700 active:translate-y-0.5 active:border-b-2 disabled:opacity-50">False</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center flex-grow flex items-center justify-center">
                        <p>Loading next question...</p>
                    </div>
                )}
            </main>
            
            {isRevealed && lastAnswerCorrect !== null && (
                 <div className={`fixed bottom-0 left-0 right-0 p-6 transition-transform duration-300 ${isRevealed ? 'translate-y-0' : 'translate-y-full'} ${lastAnswerCorrect ? 'bg-success' : 'bg-danger'}`}>
                    <div className="max-w-2xl mx-auto flex items-center">
                        <div className="mr-4">
                            {lastAnswerCorrect ? <CheckCircleIcon className="w-10 h-10 text-white" /> : <XCircleIcon className="w-10 h-10 text-white" />}
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{lastAnswerCorrect ? 'You are correct!' : 'Incorrect'}</p>
                            {!lastAnswerCorrect && currentItem && (
                                <p className="text-white font-bold">Correct answer: {getAnswerForWord(currentItem.word, currentItem.relation)}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QStudyPage;
