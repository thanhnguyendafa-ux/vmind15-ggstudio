
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, TableIcon, BrainIcon, LayersIcon, BarChartIcon, TrophyIcon, SettingsIcon } from './Icons';
import { useData } from '../hooks/useData';

const navItems = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/tables', label: 'Tables', icon: TableIcon },
  { path: '/study', label: 'Study', icon: BrainIcon },
  { path: '/flashcards', label: 'FlashCards', icon: LayersIcon },
  { path: '/stats', label: 'Stats', icon: BarChartIcon },
  { path: '/rewards', label: 'Rewards', icon: TrophyIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

const Layout: React.FC = () => {
    const { isSampleDataActive, toggleSampleData } = useData();

    return (
        <div className="flex flex-col min-h-screen">
            {isSampleDataActive && (
                 <div className="bg-yellow-400 text-yellow-900 text-center py-2 px-4 text-sm font-bold">
                    You are viewing sample data. 
                    <button onClick={() => toggleSampleData(false)} className="underline ml-2 hover:text-yellow-800">
                        [Return to my data]
                    </button>
                </div>
            )}
            <main className="flex-grow pb-24">
                <Outlet />
            </main>
            <nav className="fixed bottom-0 left-0 right-0 bg-secondary dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-around max-w-4xl mx-auto">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center py-2 text-xs w-full transition-colors duration-200 group ${
                                isActive ? 'text-accent dark:text-accent' : 'text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-slate-200'
                                }`
                            }
                        >
                            <Icon className="w-8 h-8 mb-1 transition-transform group-hover:scale-110" />
                            <span className="font-bold uppercase tracking-wider">{label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default Layout;