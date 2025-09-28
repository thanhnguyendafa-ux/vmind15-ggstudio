
import React from 'react';
import { useData } from '../hooks/useData';
import { FIBONACCI_MILESTONES } from '../constants';
import { TrophyIcon, CheckCircleIcon, XCircleIcon, LayoutGridIcon, ClipboardListIcon } from '../components/Icons';

const RewardsPage: React.FC = () => {
    const { globalStats, rewardEvents, loading } = useData();
    const userXP = globalStats?.xp ?? 0;
    const inQueueReal = globalStats?.inQueueReal ?? 0;
    const quitQueueReal = globalStats?.quitQueueReal ?? 0;

    const nextMilestone = FIBONACCI_MILESTONES.find(m => m.xp > userXP);
    const currentMilestoneIndex = nextMilestone 
        ? FIBONACCI_MILESTONES.indexOf(nextMilestone) - 1 
        : FIBONACCI_MILESTONES.length - 1;

    const previousMilestone = currentMilestoneIndex >= 0 
        ? FIBONACCI_MILESTONES[currentMilestoneIndex] 
        : { xp: 0, name: 'Start' };

    let progressPercentage = 0;
    if (nextMilestone) {
        const range = nextMilestone.xp - previousMilestone.xp;
        const progressInLevel = userXP - previousMilestone.xp;
        if (range > 0) {
            progressPercentage = (progressInLevel / range) * 100;
        }
    } else if (FIBONACCI_MILESTONES.length > 0) {
        // All milestones achieved
        progressPercentage = 100;
    }

    if (loading) {
        return <div className="p-4 sm:p-6 text-center">Loading rewards...</div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-8">
            <h1 className="text-3xl font-bold text-text-primary">Rewards & Badges</h1>
            <div className="bg-secondary p-6 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h2 className="text-xl font-bold text-accent">Your Progress</h2>
                        <p className="text-4xl font-bold my-2 text-yellow-400">{userXP.toLocaleString()} XP</p>
                    </div>
                    <div className="flex space-x-4 mt-4 sm:mt-0">
                        <div className="flex items-center text-green-400">
                            <CheckCircleIcon className="w-6 h-6 mr-2" />
                            <div>
                                <p className="font-bold">{inQueueReal}</p>
                                <p className="text-xs text-text-secondary">Completed</p>
                            </div>
                        </div>
                        <div className="flex items-center text-red-400">
                            <XCircleIcon className="w-6 h-6 mr-2" />
                             <div>
                                <p className="font-bold">{quitQueueReal}</p>
                                <p className="text-xs text-text-secondary">Quit</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="w-full bg-slate-700 rounded-full h-4">
                        <div className="bg-yellow-400 h-4 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <p className="text-sm text-text-secondary mt-2 text-right">
                        {nextMilestone ? `Next: ${nextMilestone.name} at ${nextMilestone.xp.toLocaleString()} XP` : 'All milestones reached!'}
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4">Badge Gallery</h2>
                    <div className="bg-secondary p-4 rounded-lg">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-80 overflow-y-auto">
                            {FIBONACCI_MILESTONES.slice(0, 12).map(milestone => { // Show first 12 for brevity
                                const unlocked = userXP >= milestone.xp;
                                return (
                                    <div key={milestone.name} className={`p-3 rounded-lg text-center transition-all ${unlocked ? 'bg-yellow-900/50 border border-yellow-700' : 'bg-primary opacity-60'}`}>
                                        <TrophyIcon className={`mx-auto w-8 h-8 mb-1 transition-colors ${unlocked ? 'text-yellow-400' : 'text-slate-500'}`} />
                                        <p className={`text-xs font-bold ${unlocked ? 'text-text-primary' : 'text-text-secondary'}`}>{milestone.name}</p>
                                        <p className={`text-[10px] ${unlocked ? 'text-yellow-500' : 'text-slate-500'}`}>{milestone.xp.toLocaleString()} XP</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
                    <div className="bg-secondary p-4 rounded-lg">
                        {rewardEvents && rewardEvents.length > 0 ? (
                            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {rewardEvents.map(event => (
                                    <li key={event.id} className="flex items-center text-sm">
                                        <div className="mr-3 flex-shrink-0">
                                            {event.type === 'milestone_unlocked' && <TrophyIcon className="w-6 h-6 text-yellow-400" />}
                                            {event.type === 'session_complete' && <CheckCircleIcon className="w-6 h-6 text-green-400" />}
                                            {event.type === 'session_quit' && <XCircleIcon className="w-6 h-6 text-red-400" />}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-text-primary">{event.description}</p>
                                            <p className="text-xs text-text-secondary">{new Date(event.timestamp).toLocaleString()}</p>
                                        </div>
                                        <span className={`font-bold ml-2 ${event.xpChange > 0 ? 'text-green-400' : event.xpChange < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
                                            {event.xpChange > 0 ? `+${event.xpChange}` : event.xpChange !== 0 ? event.xpChange : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                <ClipboardListIcon className="w-10 h-10 text-slate-500 mb-2"/>
                                <p className="text-text-secondary">No activity yet.</p>
                                <p className="text-xs text-slate-500">Complete a session to start earning XP!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RewardsPage;
