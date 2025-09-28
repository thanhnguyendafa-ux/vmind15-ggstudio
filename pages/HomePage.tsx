
import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { BrainIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon } from '../components/Icons';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg shadow-md flex items-center space-x-4">
        <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-full flex items-center justify-center w-12 h-12">{icon}</div>
        <div>
            <p className="text-text-secondary dark:text-slate-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-slate-200">{value}</p>
        </div>
    </div>
);

const TablePreviewCard: React.FC<{ table: import('../types').VocabTable; relationCount: number }> = ({ table, relationCount }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-secondary dark:bg-slate-800 rounded-lg shadow-md">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left flex justify-between items-center p-4"
                aria-expanded={isExpanded}
                aria-controls={`table-preview-${table.id}`}
            >
                <h3 className="text-lg font-bold text-accent dark:text-sky-400">{table.name} ({relationCount})</h3>
                {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-text-secondary dark:text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-text-secondary dark:text-slate-400" />}
            </button>
            {isExpanded && (
                <div id={`table-preview-${table.id}`} className="px-4 pb-4">
                    <ul>
                        {table.rows.slice(0, 5).map(row => (
                            <li key={row.id} className="text-text-secondary dark:text-slate-400 text-sm truncate border-b border-slate-200 dark:border-slate-700 py-1">{row.keyword}</li>
                        ))}
                    </ul>
                    <Link to={`/tables/${table.id}`} className="text-accent dark:text-sky-400 text-sm mt-2 inline-block hover:underline">View all...</Link>
                </div>
            )}
        </div>
    );
};


const HomePage: React.FC = () => {
    const { globalStats, tables, relations, loading } = useData();

    if (loading) {
        return <div className="p-4 text-center dark:text-slate-300">Loading dashboard...</div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-text-primary dark:text-slate-200">Welcome to Vmind 1.5</h1>
                <p className="text-text-secondary dark:text-slate-400">Your personalized learning hub.</p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Experience Points" value={globalStats?.xp ?? 0} icon={<span className="text-amber-500 dark:text-yellow-400 text-lg font-bold">XP</span>} />
                <StatCard title="Completed Sessions" value={globalStats?.inQueueReal ?? 0} icon={<CheckCircleIcon className="w-7 h-7 text-green-600 dark:text-green-400" />} />
                <StatCard title="Quit Sessions" value={globalStats?.quitQueueReal ?? 0} icon={<XCircleIcon className="w-7 h-7 text-red-600 dark:text-red-400" />} />
            </section>
            
            <section>
                 <Link to="/study" className="w-full flex items-center justify-center bg-accent dark:bg-sky-500 text-white dark:text-slate-900 font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors duration-200 text-xl">
                    <BrainIcon className="w-6 h-6 mr-3" />
                    Start a New Study Session
                </Link>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-text-primary dark:text-slate-200 mb-4">Recent Tables</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tables.map(table => {
                        const relationCount = relations.filter(r => r.tableId === table.id).length;
                        return <TablePreviewCard key={table.id} table={table} relationCount={relationCount} />
                    })}
                </div>
            </section>

        </div>
    );
};

export default HomePage;