import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { Link, useNavigate } from 'react-router-dom';
import CreateTableModal from '../components/CreateTableModal';
import { dataService } from '../services/dataService';
import { ColumnDef, VocabTable } from '../types';
import { XIcon, SearchIcon, ImportIcon, MoreVerticalIcon, EditIcon, TrashIcon } from '../components/Icons';

const TableActionsMenu: React.FC<{
    table: VocabTable;
    onRename: (table: VocabTable) => void;
    onDelete: (table: VocabTable) => void;
}> = ({ table, onRename, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsOpen(p => !p); }}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={`Actions for ${table.name}`}
            >
                <MoreVerticalIcon className="w-5 h-5" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-10 text-sm">
                    <button onClick={(e) => { e.stopPropagation(); onRename(table); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <EditIcon className="w-4 h-4" /> Rename
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(table); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};


const TablesPage: React.FC = () => {
    const { tables, relations, loading, fetchData } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRenameTable = async (table: VocabTable) => {
        const newName = prompt(`Enter new name for "${table.name}":`, table.name);
        if (newName && newName.trim() && newName.trim() !== table.name) {
            try {
                await dataService.renameTable(table.id, newName.trim());
                await fetchData();
            } catch (error) {
                console.error("Failed to rename table:", error);
                if (error instanceof Error) {
                    alert(`Error renaming table: ${error.message}`);
                } else {
                    alert("An unknown error occurred while renaming the table.");
                }
            }
        }
    };

    const handleDeleteTable = async (table: VocabTable) => {
        if (window.confirm(`Are you sure you want to delete the table "${table.name}"? This action cannot be undone and will also delete all associated relations and words.`)) {
            try {
                await dataService.deleteTable(table.id);
                await fetchData();
            } catch (error) {
                console.error("Failed to delete table:", error);
                alert("An error occurred while deleting the table.");
            }
        }
    };

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

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            if (!content) {
                alert("File is empty or could not be read.");
                return;
            }
            try {
                const newTable = await dataService.importTableFromCSV(content);
                await fetchData();
                navigate(`/tables/${newTable.id}`);
            } catch (error) {
                console.error("Failed to import CSV:", error);
                if (error instanceof Error) {
                    alert(`Error importing CSV: ${error.message}`);
                } else {
                    alert("An unknown error occurred during import.");
                }
            }
        };
        reader.readAsText(file);
        // Reset file input value to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
            ) : tables.length === 0 ? (
                 <div className="text-center text-text-secondary dark:text-slate-400 mt-8">
                    <p className="text-lg">No tables found.</p>
                    <p className="mt-2">Click the button below to create your first table.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTables.length > 0 ? (
                        filteredTables.map(table => {
                            const relationCount = relations.filter(r => r.tableId === table.id).length;
                            return (
                                <div key={table.id} className="bg-secondary dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-between">
                                    <Link to={`/tables/${table.id}`} className="flex-grow p-4">
                                        <h2 className="text-xl font-bold text-accent dark:text-sky-400">{table.name} ({relationCount})</h2>
                                        <p className="text-text-secondary dark:text-slate-400">{table.rows.length} words</p>
                                    </Link>
                                    <div className="p-2">
                                        <TableActionsMenu
                                            table={table}
                                            onRename={handleRenameTable}
                                            onDelete={handleDeleteTable}
                                        />
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center text-text-secondary dark:text-slate-400 mt-8">
                            No tables found matching your search for "{searchQuery}".
                        </p>
                    )}
                </div>
            )}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="mt-6 bg-accent dark:bg-sky-500 text-white dark:text-slate-950 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-800 dark:hover:bg-sky-600 transition-colors duration-200"
                >
                    + Create New Table
                </button>
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 bg-secondary dark:bg-slate-700 text-text-primary dark:text-slate-200 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200 flex items-center"
                >
                    <ImportIcon className="w-5 h-5 mr-2" /> Import from CSV
                </button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".csv"
                className="hidden"
            />
            <CreateTableModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTable}
            />
        </div>
    );
};

export default TablesPage;