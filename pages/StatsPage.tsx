import React, { useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { VocabRow } from '../types';
import { TrendingUpIcon, LogOutIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';

interface TableStats {
    id: string;
    name: string;
    wordCount: number;
    passed2Sum: number;
    avgRankPoint: number;
    avgFailureRate: number;
}

interface WordWithScore extends VocabRow {
    tableName: string;
    priorityScore: number;
}

const TableStatCard: React.FC<{ stats: TableStats }> = ({ stats }) => (
    <div className="bg-secondary p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-bold text-accent mb-2 truncate">{stats.name}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
                <p className="text-text-secondary">Words:</p>
                <p className="font-bold text-lg">{stats.wordCount}</p>
            </div>
            <div>
                <p className="text-text-secondary">Passed2 Sum:</p>
                <p className="font-bold text-lg">{stats.passed2Sum}</p>
            </div>
            <div>
                <p className="text-text-secondary">Avg. Rank:</p>
                <p className="font-bold text-lg">{stats.avgRankPoint.toFixed(1)}</p>
            </div>
            <div>
                <p className="text-text-secondary">Avg. Fail Rate:</p>
                <p className="font-bold text-lg">{(stats.avgFailureRate * 100).toFixed(1)}%</p>
            </div>
        </div>
    </div>
);


const StatsPage: React.FC = () => {
    const { globalStats, tables, studySessions, loading } = useData();
    
    const avgSuccessRate = useMemo(() => {
        if (!tables) return 0;
        const allRows = tables.flatMap(t => t.rows);
        if (allRows.length === 0) return 0;
        const totalSuccessRate = allRows.reduce((sum, row) => sum + row.stats.SuccessRate, 0);
        return (totalSuccessRate / allRows.length) * 100;
    }, [tables]);
    
    const tableStats = useMemo<TableStats[]>(() => {
        if (!tables) return [];
        return tables.map(table => {
            const rowCount = table.rows.length;
            if (rowCount === 0) {
                return {
                    id: table.id,
                    name: table.name,
                    wordCount: 0,
                    passed2Sum: 0,
                    avgRankPoint: 0,
                    avgFailureRate: 0,
                };
            }
            const passed2Sum = table.rows.reduce((sum, row) => sum + row.stats.Passed2, 0);
            const totalRankPoint = table.rows.reduce((sum, row) => sum + row.stats.RankPoint, 0);
            const totalFailureRate = table.rows.reduce((sum, row) => sum + row.stats.FailureRate, 0);

            return {
                id: table.id,
                name: table.name,
                wordCount: rowCount,
                passed2Sum,
                avgRankPoint: totalRankPoint / rowCount,
                avgFailureRate: totalFailureRate / rowCount,
            };
        });
    }, [tables]);

    const weakestWords = useMemo<WordWithScore[]>(() => {
        if (!tables || tables.length === 0) return [];

        const maxInQueueByTable: Record<string, number> = {};
        tables.forEach(table => {
            maxInQueueByTable[table.id] = table.rows.length > 0 ? Math.max(...table.rows.map(r => r.stats.InQueue)) : 0;
        });

        const allWordsWithScores = tables.flatMap(table =>
            table.rows.map(row => ({
                ...row,
                tableName: table.name,
                priorityScore: dataService.calculatePriorityScore(row, maxInQueueByTable[table.id])
            }))
        );

        allWordsWithScores.sort((a, b) => b.priorityScore - a.priorityScore);

        return allWordsWithScores.slice(0, 10);
    }, [tables]);

    const chartData = useMemo(() => {
        if (!tables || !studySessions) return null;

        const allRows = tables.flatMap(t => t.rows);

        // Success vs Failure
        const totalPassed = allRows.reduce((sum, row) => sum + row.stats.Passed1 + row.stats.Passed2, 0);
        const totalFailed = allRows.reduce((sum, row) => sum + row.stats.Failed, 0);
        const totalAttemptsAggregated = totalPassed + totalFailed;

        // Attempts over time
        const attemptsByDate = studySessions.reduce((acc, session) => {
            const date = new Date(session.createdAt).toLocaleDateString();
            acc[date] = (acc[date] || 0) + session.wordCount;
            return acc;
        }, {} as Record<string, number>);
        const attemptsOverTime = Object.entries(attemptsByDate).map(([date, attempts]) => ({ date, attempts })).slice(-7);

        // InQueue growth
        const sortedSessions = [...studySessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        let cumulativeInQueue = 0;
        const inQueueGrowthData = sortedSessions.reduce((acc, session) => {
            if (session.status === 'completed') {
                cumulativeInQueue += 1;
                const date = new Date(session.createdAt).toLocaleDateString();
                acc[date] = cumulativeInQueue;
            }
            return acc;
        }, {} as Record<string, number>);
        const inQueueGrowth = Object.entries(inQueueGrowthData).map(([date, count]) => ({ date, count })).slice(-7);

        // Words You Quit
        const quitWords = allRows.filter(row => row.stats.QuitQueue).map(row => ({
            ...row,
            tableName: tables.find(t => t.id === row.tableId)?.name || 'Unknown Table'
        }));

        return {
            successFailure: {
                passed: totalPassed,
                failed: totalFailed,
                total: totalAttemptsAggregated,
                successRate: totalAttemptsAggregated > 0 ? (totalPassed / totalAttemptsAggregated) * 100 : 0,
                failureRate: totalAttemptsAggregated > 0 ? (totalFailed / totalAttemptsAggregated) * 100 : 0,
            },
            attemptsOverTime,
            inQueueGrowth,
            quitWords
        };
    }, [tables, studySessions]);


    if (loading) {
        return <div className="p-4 sm:p-6 text-center">Loading statistics...</div>;
    }

    const maxAttempts = chartData ? Math.max(...chartData.attemptsOverTime.map(d => d.attempts), 0) : 0;
    const maxInQueue = chartData ? Math.max(...chartData.inQueueGrowth.map(d => d.count), 0) : 0;


    return (
        <div className="p-4 sm:p-6 space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-text-primary">My Statistics</h1>
                <Link to="/stats/history" className="bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-sky-500 transition-colors duration-200">
                    Session History
                </Link>
            </header>

            <section>
                <h2 className="text-2xl font-bold text-text-primary mb-4">Global KPIs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-secondary p-4 rounded-lg text-center">
                        <p className="text-text-secondary">Experience Points</p>
                        <p className="text-3xl font-bold text-yellow-400">{globalStats?.xp ?? 0}</p>
                    </div>
                     <div className="bg-secondary p-4 rounded-lg text-center">
                        <p className="text-text-secondary">Completed Sessions</p>
                        <p className="text-3xl font-bold text-green-400">{globalStats?.inQueueReal ?? 0}</p>
                    </div>
                     <div className="bg-secondary p-4 rounded-lg text-center">
                        <p className="text-text-secondary">Abandoned Sessions</p>
                        <p className="text-3xl font-bold text-red-400">{globalStats?.quitQueueReal ?? 0}</p>
                    </div>
                    <div className="bg-secondary p-4 rounded-lg text-center">
                        <p className="text-text-secondary">Avg. Success Rate</p>
                        <p className="text-3xl font-bold text-sky-400">{avgSuccessRate.toFixed(1)}%</p>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-text-primary mb-4">Per-Table Statistics</h2>
                {tables.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tableStats.map(stats => (
                           <TableStatCard key={stats.id} stats={stats} />
                        ))}
                    </div>
                ) : (
                    <p className="text-text-secondary bg-secondary p-4 rounded-lg">No tables created yet.</p>
                )}
            </section>
            
            <section>
                 <h2 className="text-2xl font-bold text-text-primary mb-4">Top 10 Weakest Words</h2>
                 <div className="bg-secondary p-4 rounded-lg">
                    {weakestWords.length > 0 ? (
                         <ul className="divide-y divide-slate-600">
                            {weakestWords.map((word, index) => (
                                <li key={word.id} className="py-3 px-2 flex justify-between items-center">
                                    <div className="flex items-center">
                                        <span className="text-text-secondary mr-4 w-6 text-center">{index + 1}.</span>
                                        <div>
                                            <p className="font-bold text-text-primary">{word.keyword}</p>
                                            <p className="text-xs text-text-secondary">{word.tableName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-sm text-yellow-400" title="Priority Score">{word.priorityScore.toFixed(2)}</p>
                                        <p className="text-xs text-text-secondary">Rank: {word.stats.RankPoint}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-text-secondary text-center py-4">No words to analyze. Add some words to your tables!</p>
                    )}
                 </div>
            </section>

            <section>
                 <h2 className="text-2xl font-bold text-text-primary mb-4">Charts & Insights</h2>
                 {chartData && (chartData.attemptsOverTime.length > 0 || chartData.quitWords.length > 0) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-8">
                            <div className="bg-secondary p-4 rounded-lg">
                                <h3 className="font-bold mb-4 flex items-center"><TrendingUpIcon className="w-5 h-5 mr-2 text-accent"/>Attempts Over Time</h3>
                                <div className="space-y-2">
                                    {chartData.attemptsOverTime.map(data => (
                                        <div key={data.date} className="flex items-center text-xs">
                                            <span className="w-20 text-text-secondary text-right pr-2">{data.date}</span>
                                            <div className="flex-grow bg-slate-700 rounded-sm h-5">
                                                <div className="bg-accent h-5 rounded-sm flex items-center justify-end px-2" style={{ width: `${maxAttempts > 0 ? (data.attempts / maxAttempts) * 100 : 0}%` }}>
                                                    <span className="font-bold text-primary">{data.attempts}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-secondary p-4 rounded-lg">
                                <h3 className="font-bold mb-4 flex items-center"><TrendingUpIcon className="w-5 h-5 mr-2 text-accent"/>Completed Sessions Growth</h3>
                                 <div className="space-y-2">
                                    {chartData.inQueueGrowth.map(data => (
                                        <div key={data.date} className="flex items-center text-xs">
                                            <span className="w-20 text-text-secondary text-right pr-2">{data.date}</span>
                                            <div className="flex-grow bg-slate-700 rounded-sm h-5">
                                                <div className="bg-sky-500 h-5 rounded-sm flex items-center justify-end px-2" style={{ width: `${maxInQueue > 0 ? (data.count / maxInQueue) * 100 : 0}%` }}>
                                                    <span className="font-bold text-primary">{data.count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Right Column */}
                        <div className="space-y-8">
                            <div className="bg-secondary p-4 rounded-lg">
                                <h3 className="font-bold mb-4">Success vs. Failure (All Time)</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <CheckCircleIcon className="w-5 h-5 mr-2 text-green-400" />
                                        <span className="w-24">Success</span>
                                        <div className="flex-grow bg-slate-700 h-6 rounded-md">
                                            <div className="bg-green-500 h-6 rounded-md flex items-center justify-center font-bold" style={{width: `${chartData.successFailure.successRate}%`}}>
                                               {chartData.successFailure.passed}
                                            </div>
                                        </div>
                                    </div>
                                     <div className="flex items-center">
                                        <XCircleIcon className="w-5 h-5 mr-2 text-red-400" />
                                        <span className="w-24">Failure</span>
                                        <div className="flex-grow bg-slate-700 h-6 rounded-md">
                                            <div className="bg-red-500 h-6 rounded-md flex items-center justify-center font-bold" style={{width: `${chartData.successFailure.failureRate}%`}}>
                                                {chartData.successFailure.failed}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                             <div className="bg-secondary p-4 rounded-lg">
                                <h3 className="font-bold mb-4 flex items-center"><LogOutIcon className="w-5 h-5 mr-2 text-red-400"/>Words You Quit On</h3>
                                {chartData.quitWords.length > 0 ? (
                                    <ul className="divide-y divide-slate-600 max-h-60 overflow-y-auto">
                                        {chartData.quitWords.map(word => (
                                            <li key={word.id} className="py-2 px-1 flex justify-between items-center text-sm">
                                                <p className="font-bold text-text-primary">{word.keyword}</p>
                                                <p className="text-xs text-text-secondary">{word.tableName}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-text-secondary text-center py-4">No quit words found. Keep it up!</p>
                                )}
                            </div>
                        </div>
                    </div>
                 ) : (
                    <div className="bg-secondary p-4 rounded-lg h-64 flex items-center justify-center">
                        <p className="text-text-secondary">Not enough data to display charts. Complete some study sessions!</p>
                    </div>
                 )}
            </section>
        </div>
    );
};

export default StatsPage;