
import React, { useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { VocabRow, VocabTable } from '../types';

// A type for the calculated stats for each table
interface TableStats {
    id: string;
    name: string;
    wordCount: number;
    passed2Sum: number;
    avgRankPoint: number;
    avgFailureRate: number;
}

// A type for a word with its calculated priority score and table name
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
    const { globalStats, tables, loading } = useData();
    
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


    if (loading) {
        return <div className="p-4 sm:p-6 text-center">Loading statistics...</div>;
    }

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                 <h2 className="text-2xl font-bold text-text-primary mb-4">Charts</h2>
                 <div className="bg-secondary p-4 rounded-lg h-64 flex items-center justify-center">
                    <p className="text-text-secondary">Charts coming soon...</p>
                 </div>
            </section>

        </div>
    );
};

export default StatsPage;