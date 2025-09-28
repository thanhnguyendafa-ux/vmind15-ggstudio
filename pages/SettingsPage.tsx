
import React from 'react';
import { useData } from '../hooks/useData';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useData();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent dark:focus:ring-offset-slate-800`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            <span
                className={`${
                    isDark ? 'bg-sky-500' : 'bg-gray-400'
                } absolute h-6 w-11 rounded-full transition-colors ease-in-out duration-200`}
            ></span>
            <span
                className={`${
                    isDark ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform ease-in-out duration-200`}
            />
        </button>
    );
}

const SettingsPage: React.FC = () => {
    const { theme } = useData();

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-text-primary dark:text-slate-200">Settings</h1>
            <div className="space-y-6">
                <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-bold text-accent dark:text-sky-400 mb-2">Account</h2>
                    <p className="text-text-secondary dark:text-slate-400">Currently in Offline Mode.</p>
                    <button className="mt-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-500">
                        Login with Google to Sync
                    </button>
                </div>
                 <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-bold text-accent dark:text-sky-400 mb-2">Backup & Sync</h2>
                    <p className="text-text-secondary dark:text-slate-400">Auto-backup: Every 6 hours.</p>
                     <button className="mt-2 bg-accent dark:bg-sky-500 text-white dark:text-slate-900 font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-sky-600 transition-colors">
                        Backup Now
                    </button>
                </div>
                 <div className="bg-secondary dark:bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-bold text-accent dark:text-sky-400 mb-2">Theme</h2>
                    <div className="flex items-center justify-between">
                        <p className="text-text-secondary dark:text-slate-400">
                            {theme === 'dark' ? 'Dark Mode is enabled.' : 'Light Mode is enabled.'}
                        </p>
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;