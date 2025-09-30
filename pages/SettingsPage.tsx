import React, { useState, useRef } from 'react';
import { useData } from '../hooks/useData';
import { VmindSettings, AutoBackupSettings, ConflictResolutionPolicy, BackupRecord, VocabRow, VocabRowStats, ColumnDef } from '../types';
import { dataService } from '../services/dataService';
import { DatabaseIcon, ExportIcon, FileJsonIcon, FileTextIcon, LogOutIcon, UserIcon, ImportIcon } from '../components/Icons';
import { DEFAULT_COLUMNS } from '../constants';
import { Link } from 'react-router-dom';

const SettingToggle: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}> = ({ checked, onChange, label }) => {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent dark:focus:ring-offset-slate-800`}
            aria-label={label}
            role="switch"
            aria-checked={checked}
        >
            <span
                className={`${
                    checked ? 'bg-sky-500' : 'bg-gray-400 dark:bg-slate-600'
                } absolute h-6 w-11 rounded-full transition-colors ease-in-out duration-200`}
            ></span>
            <span
                className={`${
                    checked ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform ease-in-out duration-200`}
            />
        </button>
    );
}

const getRowValue = (row: VocabRow, column: string, tableColumns: ColumnDef[]): any => {
    const userColumnNames = tableColumns.map(c => c.name);
    if (column === 'keyword') return row.keyword;
    if (userColumnNames.includes(column)) return row.data[column] || '';
    if (DEFAULT_COLUMNS.includes(column)) {
        if (column === 'Tags') return row.tags.join(', ');
        if (Object.prototype.hasOwnProperty.call(row.stats, column)) {
            return row.stats[column as keyof VocabRowStats];
        }
    }
    return '';
};


const SettingsPage: React.FC = () => {
    const { 
        settings, 
        updateSettings, 
        backupHistory, 
        fetchData, 
        tables,
        session,
        signOut,
        isSampleDataActive,
        toggleSampleData
    } = useData();
    const theme = settings?.theme || 'dark';
    const [isBackingUp, setIsBackingUp] = useState<false | 'json' | 'csv'>(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const handleSettingsChange = (change: Partial<VmindSettings>) => {
        if (updateSettings) {
            updateSettings(change);
        }
    };
    
    const toggleTheme = () => {
        if (settings) {
            const newTheme = settings.theme === 'light' ? 'dark' : 'light';
            handleSettingsChange({ theme: newTheme });
        }
    };
    
    const handleAutoBackupChange = (change: Partial<AutoBackupSettings>) => {
        if (settings) {
            const newAutoBackupSettings = { ...settings.autoBackup, ...change };
            handleSettingsChange({ autoBackup: newAutoBackupSettings });
        }
    };

    const handleManualBackup = async (format: 'json' | 'csv') => {
        setIsBackingUp(format);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
        if (format === 'json') {
            try {
                const allData = await dataService.getAllDataForBackup();
                const jsonString = JSON.stringify(allData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `vmind_backup_${timestamp}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } catch (error) {
                console.error("Failed to generate JSON backup:", error);
                alert("Could not generate JSON backup.");
            }
        } else if (format === 'csv') {
            if (!tables || tables.length === 0) {
                alert("No tables to export.");
                setIsBackingUp(false);
                return;
            }
    
            try {
                for (const table of tables) {
                    const headersForExport = ['keyword', ...table.columns.map(c => c.name), ...DEFAULT_COLUMNS.filter(c => c !== 'PriorityScore')];
                    const csvRows = [headersForExport.join(',')];
    
                    table.rows.forEach(row => {
                        const values = headersForExport.map(header => {
                            let value = getRowValue(row, header, table.columns);
                            if (value === null || value === undefined) {
                                value = '';
                            }
                            const stringValue = String(value);
                            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                                return `"${stringValue.replace(/"/g, '""')}"`;
                            }
                            return stringValue;
                        });
                        csvRows.push(values.join(','));
                    });
    
                    const csvString = csvRows.join('\n');
                    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${table.name.replace(/\s+/g, '_')}_${timestamp}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                    await new Promise(res => setTimeout(res, 200)); 
                }
            } catch(error) {
                console.error("Failed to generate CSV backup:", error);
                alert("Could not generate CSV backup.");
            }
        }
    
        await dataService.triggerManualBackup(format);
        await fetchData(); 
        setIsBackingUp(false);
        alert(`Manual ${format.toUpperCase()} backup files have been downloaded.`);
    };

    const handleRestoreFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            if (!content) {
                alert("File is empty or could not be read.");
                return;
            }

            if (!window.confirm("Are you sure you want to restore from this backup? All your current data will be overwritten.")) {
                if (restoreInputRef.current) restoreInputRef.current.value = '';
                return;
            }

            try {
                const parsedData = JSON.parse(content);
                await dataService.restoreDataFromJson(parsedData);
                await fetchData();
                alert("Restore successful! The application has been updated with your backup data.");
            } catch (error) {
                console.error("Failed to restore from JSON:", error);
                 if (error instanceof Error) {
                    alert(`Error restoring from backup: ${error.message}`);
                } else {
                    alert("An unknown error occurred during restore. The file might be corrupted or in the wrong format.");
                }
            } finally {
                if (restoreInputRef.current) restoreInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleRestore = (backup: BackupRecord) => {
        if (window.confirm(`Are you sure you want to restore from the backup created on ${new Date(backup.timestamp).toLocaleString()}? This will overwrite your current data.`)) {
            alert("Restore functionality is not implemented in this demo.");
        }
    };
    
    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            alert("Data synced successfully! (This is a placeholder)");
        }, 1500);
    };
    
    const conflictPolicyOptions: { value: ConflictResolutionPolicy, label: string }[] = [
        { value: 'merge', label: 'Merge' },
        { value: 'overwrite_local', label: 'Overwrite Local' },
        { value: 'overwrite_cloud', label: 'Overwrite Cloud' },
    ];

    const autoBackupIntervals: AutoBackupSettings['interval'][] = ['30m', '2h', '6h', '1d', '2d', '7d'];
    const autoBackupKeepOptions = [3, 5, 10];

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-3xl font-bold mb-6 text-text-primary dark:text-slate-200">Settings</h1>
            <div className="space-y-6">
                <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-bold text-accent dark:text-sky-400 mb-2 flex items-center gap-2">
                        <UserIcon className="w-6 h-6"/>
                        Account
                    </h2>
                    {session ? (
                        <div className="space-y-3">
                            <p className="text-text-secondary dark:text-slate-400">
                                Logged in as: <span className="font-bold text-text-primary dark:text-slate-200">{session.user.email}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="flex items-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-500 disabled:opacity-60 disabled:cursor-wait"
                                >
                                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                                </button>
                                <button 
                                    onClick={signOut}
                                    className="flex items-center bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600"
                                >
                                    <LogOutIcon className="w-5 h-5 mr-2" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-text-secondary dark:text-slate-400">Log in or create an account to sync your data across devices.</p>
                            <div className="mt-3 flex gap-4">
                               <Link to="/login" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent-darker transition-colors">
                                    Login
                                </Link>
                                <Link to="/signup" className="bg-slate-200 dark:bg-slate-600 text-text-primary dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                                    Sign Up
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-bold text-accent dark:text-sky-400 mb-2">Data Management</h2>
                    <div className="flex items-center justify-between">
                        <p className="font-semibold text-text-primary dark:text-slate-200">Load Sample Data</p>
                        <SettingToggle
                            checked={isSampleDataActive}
                            onChange={() => toggleSampleData(!isSampleDataActive)}
                            label="Load Sample Data"
                        />
                    </div>
                     <p className="text-xs text-text-secondary dark:text-slate-500 mt-2">
                        Explore app features with pre-loaded data. Any changes made to sample data will not be saved.
                    </p>
                </div>
                 <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                        <DatabaseIcon className="w-6 h-6 text-accent dark:text-sky-400" />
                        <h2 className="text-lg font-bold text-accent dark:text-sky-400">Backup & Sync</h2>
                    </div>
                    
                    {/* Auto Backup */}
                    <div className="p-3 bg-primary dark:bg-slate-900/50 rounded-md">
                        <div className="flex justify-between items-center">
                            <label htmlFor="auto-backup-toggle" className="font-semibold">Auto Backup (Local)</label>
                            <SettingToggle checked={settings?.autoBackup?.enabled ?? false} onChange={(checked) => handleAutoBackupChange({ enabled: checked })} label="Toggle auto backup"/>
                        </div>
                        {settings?.autoBackup.enabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700">
                                <div>
                                    <label htmlFor="backup-interval" className="block text-sm text-text-secondary mb-1">Interval</label>
                                    <select id="backup-interval" value={settings.autoBackup.interval} onChange={(e) => handleAutoBackupChange({ interval: e.target.value as AutoBackupSettings['interval']})} className="w-full bg-secondary p-2 rounded-md border border-slate-600">
                                        {autoBackupIntervals.map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label htmlFor="backup-keep" className="block text-sm text-text-secondary mb-1">Keep last</label>
                                    <select id="backup-keep" value={settings.autoBackup.keep} onChange={(e) => handleAutoBackupChange({ keep: parseInt(e.target.value) })} className="w-full bg-secondary p-2 rounded-md border border-slate-600">
                                        {autoBackupKeepOptions.map(k => <option key={k} value={k}>{k} backups</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Manual Backup */}
                    <div className="p-3 bg-primary dark:bg-slate-900/50 rounded-md">
                        <p className="font-semibold mb-2">Manual Backup & Restore</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             <button onClick={() => handleManualBackup('json')} disabled={!!isBackingUp} className="flex items-center justify-center bg-accent dark:bg-sky-500 text-white dark:text-slate-950 font-semibold py-2 px-4 rounded-lg hover:bg-blue-800 dark:hover:bg-sky-600 transition-colors disabled:opacity-60">
                                <ExportIcon className="w-5 h-5 mr-2" /> {isBackingUp === 'json' ? 'Backing up...' : 'Backup JSON'}
                            </button>
                             <button onClick={() => handleManualBackup('csv')} disabled={!!isBackingUp} className="flex items-center justify-center bg-accent dark:bg-sky-500 text-white dark:text-slate-950 font-semibold py-2 px-4 rounded-lg hover:bg-blue-800 dark:hover:bg-sky-600 transition-colors disabled:opacity-60">
                                <ExportIcon className="w-5 h-5 mr-2" /> {isBackingUp === 'csv' ? 'Backing up...' : 'Backup CSV'}
                            </button>
                            <button onClick={() => restoreInputRef.current?.click()} className="lg:col-span-1 sm:col-span-2 flex items-center justify-center bg-secondary dark:bg-slate-600 text-text-primary dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors">
                                <ImportIcon className="w-5 h-5 mr-2" /> Load Backup JSON
                            </button>
                            <input type="file" ref={restoreInputRef} onChange={handleRestoreFromJson} accept=".json" className="hidden" />
                        </div>
                    </div>

                    {/* Conflict Resolution */}
                     <div className="p-3 bg-primary dark:bg-slate-900/50 rounded-md">
                        <label htmlFor="conflict-policy" className="font-semibold">Sync Conflict Policy</label>
                        <p className="text-xs text-text-secondary mb-2">Default action when local and cloud data differ.</p>
                         <select id="conflict-policy" value={settings?.conflictPolicy} onChange={(e) => handleSettingsChange({ conflictPolicy: e.target.value as ConflictResolutionPolicy })} className="w-full bg-secondary p-2 rounded-md border border-slate-600">
                            {conflictPolicyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    {/* Backup History */}
                    <div className="p-3 bg-primary dark:bg-slate-900/50 rounded-md">
                        <p className="font-semibold mb-2">Backup History (Last 5)</p>
                        <ul className="space-y-2">
                           {backupHistory.map(b => (
                               <li key={b.id} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                                   <div className="flex items-center gap-2">
                                       {b.format === 'json' ? <FileJsonIcon className="w-5 h-5 text-yellow-400" /> : <FileTextIcon className="w-5 h-5 text-sky-400"/>}
                                       <div>
                                           <p className="font-mono text-xs">{b.fileRef}</p>
                                           <p className="text-xs text-text-secondary">{new Date(b.timestamp).toLocaleString()} ({b.type})</p>
                                       </div>
                                   </div>
                                   <button onClick={() => handleRestore(b)} className="bg-primary hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold py-1 px-3 rounded-md text-xs">Restore</button>
                               </li>
                           ))}
                        </ul>
                    </div>
                </div>
                 <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-bold text-accent dark:text-sky-400 mb-2">Theme</h2>
                    <div className="flex items-center justify-between">
                        <p className="text-text-secondary dark:text-slate-400">
                            {theme === 'dark' ? 'Dark Mode is enabled.' : 'Light Mode is enabled.'}
                        </p>
                        <SettingToggle 
                            checked={theme === 'dark'}
                            onChange={toggleTheme}
                            label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        />
                    </div>
                </div>
                 <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-bold text-accent dark:text-sky-400 mb-2">Gamification</h2>
                    <div className="flex items-center justify-between">
                        <p className="text-text-secondary dark:text-slate-400">Quit Penalty</p>
                        <SettingToggle
                            checked={settings?.quitPenaltyEnabled ?? false}
                            onChange={(checked) => handleSettingsChange({ quitPenaltyEnabled: checked })}
                            label="Toggle quit penalty"
                        />
                    </div>
                     <p className="text-xs text-text-secondary dark:text-slate-500 mt-2">
                        When enabled, you lose 30 XP for abandoning a study session.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;