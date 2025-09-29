import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { Link, useNavigate } from 'react-router-dom';
import CreateTableModal from '../components/CreateTableModal';
import { dataService } from '../services/dataService';
import { ColumnDef } from '../types';
import { XIcon, SearchIcon } from '../components/Icons';

const TablesPage: React.FC = () => {
    const { tables, relations, loading, fetchData } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateTable = async (name: string, columns: ColumnDef[]) => {
        try {
            const newTable = await dataService.createTable(name, columns);
            await fetchData(); // Refresh data context
            setIsModalOpen(false);
            navigate(`/tables/${newTable.id}`);
        } catch (error) {
            console.error("Failed to create table:", error);
            alert("There was an error creating the table. Please try again.");
        }
    };

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-3xl font-bold mb-6 text-text-primary dark:text-slate-200">My Tables</h1>

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-text-secondary dark:text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search tables..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-secondary dark:bg-slate-800 p-3 pl-10 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-accent dark:focus:ring-sky-500 focus:outline-none transition-shadow"
                    aria-label="Search for a table by name"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-slate-200 transition-colors"
                        aria-label="Clear search"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {loading ? (
                <p className="dark:text-slate-300">Loading tables...</p>
            ) : (
                <div className="space-y-4">
                    {filteredTables.length > 0 ? (
                        filteredTables.map(table => {
                            const relationCount = relations.filter(r => r.tableId === table.id).length;
                            return (
                                <Link to={`/tables/${table.id}`} key={table.id}>
                                    <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg shadow-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                        <h2 className="text-xl font-bold text-accent dark:text-sky-400">{table.name} ({relationCount})</h2>
                                        <p className="text-text-secondary dark:text-slate-400">{table.rows.length} words</p>
                                    </div>
                                </Link>
                            )
                        })
                    ) : (
                        <p className="text-center text-text-secondary dark:text-slate-400 mt-8">No tables found matching your search.</p>
                    )}
                </div>
            )}
             <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-6 bg-accent dark:bg-sky-500 text-white dark:text-slate-950 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-800 dark:hover:bg-sky-600 transition-colors duration-200"
            >
                + Create New Table
            </button>
            <CreateTableModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTable}
            />
        </div>
    );
};

export default TablesPage;