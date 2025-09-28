
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, TableIcon, BrainIcon, LayersIcon, BarChartIcon, TrophyIcon, SettingsIcon } from './Icons';

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
    const location = useLocation();

    return (
        <div className="min-h-screen bg-primary dark:bg-slate-900 flex flex-col">
            <main className="flex-grow pb-20">
                <Outlet />
            </main>
            <nav className="fixed bottom-0 left-0 right-0 bg-secondary dark:bg-slate-800 border-t border-slate-200 dark:border-slate-600 shadow-lg">
                <div className="flex justify-around max-w-4xl mx-auto">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center p-2 text-xs w-full transition-colors duration-200 ${
                                isActive ? 'text-accent dark:text-sky-400 bg-secondary dark:bg-slate-800' : 'text-text-secondary dark:text-slate-400 hover:text-accent dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                                }`
                            }
                        >
                            <Icon className="w-6 h-6 mb-1" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default Layout;