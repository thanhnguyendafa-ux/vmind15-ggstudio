import React, { useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link, useNavigate } from 'react-router-dom';
import { BrainIcon, FireIcon, TrophyIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';
import { dataService } from '../services/dataService';
import { VocabRow } from '../types';

type AugmentedVocabRow = VocabRow & {
    tableName: string;
    priorityScore: number;
};

const DAILY_XP_GOAL = 100; // Define a daily goal for gamification

const HomePage: React.FC = () => {
    const { tables, relations, studySessions, rewardEvents, loading } = useData();
    const navigate = useNavigate();

    // Memoize complex calculations
    const dashboardData = useMemo(() => {
        if (!tables || !studySessions || !rewardEvents) {
            return {
                priorityWords: [],
                weakestWords: [],
                xpToday: 0,
                streak: 0,
                recentActivity: [],
            };
        }

        // --- Calculate Priority Words ---
        const maxInQueueByTable: Record<string, number> = {};
        tables.forEach(table => {
            maxInQueueByTable[table.id] = table.rows.length > 0 ? Math.max(...table.rows.map(r => r.stats.InQueue)) : 0;
        });

        const allWordsWithScores: AugmentedVocabRow[] = tables.flatMap(table =>
            table.rows.map(row => ({
                ...row,
                tableName: table.name,
                priorityScore: dataService.calculatePriorityScore(row, maxInQueueByTable[table.id])
            }))
        );
        allWordsWithScores.sort((a, b) => b.priorityScore - a.priorityScore);

        // --- Calculate Weakest Words ---
        const weakestWords = tables.flatMap(table => table.rows.map(row => ({...row, tableName: table.name})))
            .filter(row => row.stats.TotalAttempt >= 3) // Only consider words attempted a few times
            .sort((a, b) => a.stats.SuccessRate - b.stats.SuccessRate)
            .slice(0, 5);

        // --- Calculate Daily Progress & Streak ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const xpToday = rewardEvents
            .filter(event => new Date(event.timestamp) >= today && event.xpChange > 0)
            .reduce((sum, event) => sum + event.xpChange, 0);

        const studyDays = new Set(
            studySessions
                .filter(s => s.status === 'completed')
                .map(s => new Date(s.createdAt).toISOString().split('T')[0])
        );

        let streak = 0;
        let currentDate = new Date();
        while (studyDays.has(currentDate.toISOString().split('T')[0])) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        const recentActivity = rewardEvents.slice(0, 5);

        return {
            priorityWords: allWordsWithScores,
            weakestWords,
            xpToday,
            streak,
            recentActivity,
        };
    }, [tables, studySessions, rewardEvents]);

    const handleStartReview = () => {
        const wordsToReview = dashboardData.priorityWords.slice(0, 15);
        if (wordsToReview.length < 5) {
            alert("You need at least 5 words ready for review to start a session.");
            return;
        }

        const tableIds = [...new Set(wordsToReview.map(w => w.tableId))];
        const availableRelations = relations.filter(r => tableIds.includes(r.tableId));
        
        if (availableRelations.length === 0) {
            alert("No study relations found for the words ready for review. Please create a relation for the relevant tables first.");
            return;
        }

        const availableModes = [...new Set(availableRelations.flatMap(r => r.modes))];

        navigate('/study-session', {
            state: {
                words: wordsToReview,
                tableIds,
                relationIds: availableRelations.map(r => r.id),
                modes: availableModes,
                useRandomRelation: true,
                wordCount: wordsToReview.length,
            }
        });
    };

    if (loading) {
        return <div className="p-4 text-center dark:text-slate-300">Loading dashboard...</div>;
    }
    
    const wordsReadyForReview = dashboardData.priorityWords.slice(0, 5);
    const reviewCount = Math.min(dashboardData.priorityWords.length, 15);

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-text-primary dark:text-slate-200">Today's Dashboard</h1>
                <p className="text-text-secondary dark:text-slate-400">Here's your plan for today. Let's get started!</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Primary Action */}
                    <div className="bg-secondary dark:bg-slate-800 p-6 rounded-lg shadow-md text-center">
                        <BrainIcon className="w-12 h-12 mx-auto text-accent dark:text-sky-400 mb-4" />
                        <h2 className="text-2xl font-bold text-text-primary dark:text-slate-200">You have {dashboardData.priorityWords.length} words to practice.</h2>
                        <p className="text-text-secondary dark:text-slate-400 mb-6">Let's review the top {reviewCount} highest priority words now.</p>
                        <button
                            onClick={handleStartReview}
                            disabled={reviewCount < 5}
                            className="w-full max-w-xs mx-auto flex items-center justify-center bg-accent dark:bg-sky-500 text-white dark:text-slate-950 font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-blue-800 dark:hover:bg-sky-600 transition-transform transform hover:scale-105 duration-200 text-xl disabled:bg-slate-500 disabled:cursor-not-allowed disabled:transform-none"
                        >
                           Review {reviewCount} Words Now
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Words Ready for Review */}
                        <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg shadow-md">
                            <h3 className="font-bold text-lg mb-3 text-text-primary dark:text-slate-200">Ready for Review</h3>
                            {wordsReadyForReview.length > 0 ? (
                                <ul className="space-y-2">
                                    {wordsReadyForReview.map(word => (
                                        <li key={word.id} className="flex justify-between items-center bg-primary dark:bg-slate-700/50 p-2 rounded-md text-sm">
                                            <Link to={`/tables/${word.tableId}`} className="font-semibold text-accent dark:text-sky-400 hover:underline truncate pr-2">{word.keyword}</Link>
                                            <span className="font-mono text-xs text-yellow-500 dark:text-yellow-400" title="Priority Score">{word.priorityScore.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-text-secondary dark:text-slate-400">You're all caught up!</p>}
                        </div>

                        {/* Weakest Links */}
                        <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg shadow-md">
                            <h3 className="font-bold text-lg mb-3 text-text-primary dark:text-slate-200">Weakest Links</h3>
                             {dashboardData.weakestWords.length > 0 ? (
                                <div className="flex overflow-x-auto space-x-3 pb-2 -m-1 p-1 scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                    {dashboardData.weakestWords.map(word => (
                                        <Link to={`/tables/${word.tableId}`} key={word.id} className="flex-shrink-0 w-40 bg-primary dark:bg-slate-700/50 p-3 rounded-lg hover:shadow-lg transition-shadow">
                                            <p className="font-bold truncate text-text-primary dark:text-slate-200">{word.keyword}</p>
                                            <p className="text-xs text-text-secondary dark:text-slate-400 truncate">{word.tableName}</p>
                                            <p className="text-sm font-semibold text-red-500 dark:text-red-400 mt-2">{(word.stats.SuccessRate * 100).toFixed(0)}% Correct</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-text-secondary dark:text-slate-400">No weak words identified yet. Keep practicing!</p>}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Daily Goal */}
                    <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg shadow-md text-center">
                        <h3 className="font-bold text-lg mb-3 text-text-primary dark:text-slate-200">Daily Goal</h3>
                         <div className="relative w-32 h-32 mx-auto">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-slate-300 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                <path className="text-yellow-500 dark:text-yellow-400" strokeDasharray={`${Math.min(dashboardData.xpToday / DAILY_XP_GOAL * 100, 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path>
                            </svg>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-text-primary dark:text-slate-200">{dashboardData.xpToday}</span>
                                <span className="text-sm text-text-secondary dark:text-slate-400">/ {DAILY_XP_GOAL} XP</span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-center text-lg font-bold text-orange-500 dark:text-orange-400">
                           <FireIcon className="w-6 h-6 mr-2" /> {dashboardData.streak}-Day Streak
                        </div>
                    </div>
                    
                    {/* Recent Activity */}
                    <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-3 text-text-primary dark:text-slate-200">Recent Activity</h3>
                        {dashboardData.recentActivity.length > 0 ? (
                            <ul className="space-y-3">
                                {dashboardData.recentActivity.map(event => (
                                    <li key={event.id} className="flex items-center text-sm">
                                        <div className="mr-3 flex-shrink-0">
                                            {event.type === 'milestone_unlocked' && <TrophyIcon className="w-5 h-5 text-yellow-400" />}
                                            {event.type === 'session_complete' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                                            {event.type === 'session_quit' && <XCircleIcon className="w-5 h-5 text-red-400" />}
                                        </div>
                                        <p className="flex-grow text-text-primary dark:text-slate-300 truncate">{event.description}</p>
                                        {event.xpChange !== 0 && (
                                            <span className={`font-bold ml-2 ${event.xpChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {event.xpChange > 0 ? `+${event.xpChange}` : event.xpChange}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-text-secondary dark:text-slate-400">No recent activity.</p>}
                         <Link to="/rewards" className="text-accent dark:text-sky-400 text-sm mt-3 inline-block hover:underline">View all activity...</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
