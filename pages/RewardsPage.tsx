
import React, { useMemo, useState } from 'react';
import { useData } from '../hooks/useData';
import { FIBONACCI_MILESTONES } from '../constants';
import { TrophyIcon, CheckCircleIcon, XCircleIcon, ClipboardListIcon, FireIcon } from '../components/Icons';
import { RewardEvent } from '../types';

type ActivityFilter = 'all' | 'milestone_unlocked' | 'session';

const RewardsPage: React.FC = () => {
    const { globalStats, rewardEvents, studySessions, loading } = useData();
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

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
        progressPercentage = 100;
    }

    const trophyCaseData = useMemo(() => {
        const unlockedMap = new Map<string, string>();
        if (rewardEvents) {
            rewardEvents.forEach(event => {
                if (event.type === 'milestone_unlocked') {
                    const match = event.description.match(/Unlocked "(.+?)" badge!/);
                    if (match && match[1] && !unlockedMap.has(match[1])) {
                        unlockedMap.set(match[1], new Date(event.timestamp).toLocaleDateString());
                    }
                }
            });
        }

        const highestMilestone = currentMilestoneIndex >= 0 ? FIBONACCI_MILESTONES[currentMilestoneIndex] : null;

        const latestMilestoneEvent = rewardEvents?.find(event => event.type === 'milestone_unlocked');
        let latestMilestone = null;
        if (latestMilestoneEvent) {
            const match = latestMilestoneEvent.description.match(/Unlocked "(.+?)" badge!/);
            if (match && match[1]) {
                latestMilestone = FIBONACCI_MILESTONES.find(m => m.name === match[1]) || null;
            }
        }

        const studyDays = new Set(
            studySessions
                ?.filter(s => s.status === 'completed')
                .map(s => new Date(s.createdAt).toISOString().split('T')[0])
        );
        let streak = 0;
        if (studyDays) {
            let currentDate = new Date();
            while (studyDays.has(currentDate.toISOString().split('T')[0])) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }
        }
        
        return { unlockedMap, highestMilestone, latestMilestone, streak };
    }, [rewardEvents, studySessions, currentMilestoneIndex]);

    const nextMilestoneIndex = useMemo(() => 
        FIBONACCI_MILESTONES.findIndex(m => m.xp > userXP),
    [userXP]);

    const filteredEvents = useMemo(() => {
        if (!rewardEvents) return [];
        if (activityFilter === 'all') {
            return rewardEvents;
        }
        if (activityFilter === 'milestone_unlocked') {
            return rewardEvents.filter(e => e.type === 'milestone_unlocked');
        }
        // activityFilter === 'session'
        return rewardEvents.filter(e => e.type === 'session_complete' || e.type === 'session_quit');
    }, [rewardEvents, activityFilter]);

    const groupedEvents = useMemo(() => {
        const groups: Record<string, RewardEvent[]> = {};
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const isSameDay = (d1: Date, d2: Date) => 
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        filteredEvents.forEach(event => {
            const eventDate = new Date(event.timestamp);
            let groupKey: string;

            if (isSameDay(eventDate, today)) {
                groupKey = 'Today';
            } else if (isSameDay(eventDate, yesterday)) {
                groupKey = 'Yesterday';
            } else {
                groupKey = eventDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(event);
        });
        return groups;
    }, [filteredEvents]);

    const eventDetails = (event: RewardEvent) => {
        switch (event.type) {
            case 'milestone_unlocked':
                return { icon: TrophyIcon, color: 'text-yellow-400', title: 'Milestone Unlocked!' };
            case 'session_complete':
                return { icon: CheckCircleIcon, color: 'text-green-400', title: 'Session Complete' };
            case 'session_quit':
                return { icon: XCircleIcon, color: 'text-red-400', title: 'Session Quit' };
            default:
                return { icon: ClipboardListIcon, color: 'text-text-secondary', title: 'Activity' };
        }
    };

    if (loading) {
        return <div className="p-4 sm:p-6 text-center">Loading rewards...</div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-8">
            <h1 className="text-3xl font-bold text-text-primary">Rewards & Badges</h1>
            
            <div className="bg-secondary p-6 rounded-lg shadow-lg text-center">
                 <div className="relative w-48 h-48 mx-auto mb-4">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path className="text-slate-300 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                        <path className="text-yellow-400" strokeDasharray={`${progressPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path>
                    </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <TrophyIcon className="w-16 h-16 text-yellow-400" />
                         <p className="text-sm font-bold text-text-secondary mt-1">{previousMilestone.name}</p>
                    </div>
                </div>
                <h2 className="text-4xl font-black my-2 text-text-primary">{userXP.toLocaleString()} XP</h2>
                <p className="text-sm text-text-secondary mt-2">
                    {nextMilestone ? `${(nextMilestone.xp - userXP).toLocaleString()} XP to '${nextMilestone.name}'` : 'All milestones reached!'}
                </p>
                <div className="mt-6 flex justify-center space-x-6">
                    <div className="flex items-center text-green-400">
                        <CheckCircleIcon className="w-6 h-6 mr-2" />
                        <div>
                            <p className="font-bold text-lg">{inQueueReal}</p>
                            <p className="text-xs text-text-secondary">Completed</p>
                        </div>
                    </div>
                    <div className="flex items-center text-red-400">
                        <XCircleIcon className="w-6 h-6 mr-2" />
                            <div>
                            <p className="font-bold text-lg">{quitQueueReal}</p>
                            <p className="text-xs text-text-secondary">Quit</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4">Milestone Path</h2>
                    <div className="bg-secondary p-4 rounded-lg">
                        <div className="relative max-h-[30rem] overflow-y-auto pr-2 scrollbar scrollbar-thin scrollbar-thumb-slate-500 dark:scrollbar-thumb-slate-400 scrollbar-track-slate-300 dark:scrollbar-track-slate-800">
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-700 transform -translate-x-1/2"></div>
                            {FIBONACCI_MILESTONES.map((milestone, index) => {
                                const isUnlocked = userXP >= milestone.xp;
                                const isNext = index === nextMilestoneIndex;
                                const unlockDate = trophyCaseData.unlockedMap.get(milestone.name);
                                const sideClass = index % 2 === 0 ? 'mr-auto' : 'ml-auto';
                
                                return (
                                    <div key={milestone.name} className="relative flex justify-center py-4">
                                        <div className={`w-4 h-4 rounded-full absolute top-1/2 -translate-y-1/2 z-10 border-4 border-secondary dark:border-slate-800 ${isUnlocked ? 'bg-yellow-400' : 'bg-slate-600'}`}></div>
                                        <div className={`w-[calc(50%-2rem)] ${sideClass} relative group`}>
                                            <TrophyIcon className={`w-12 h-12 p-2 rounded-full transition-all duration-300
                                                ${isUnlocked ? 'text-yellow-400 bg-slate-800' : 'text-slate-600 bg-slate-800'}
                                                ${isNext ? 'animate-pulse ring-2 ring-yellow-400' : ''}
                                                ${index % 2 === 0 ? 'float-right' : 'float-left'}
                                            `} />
                                            <div className={`absolute bottom-full mb-2 w-48 bg-slate-900 text-white text-xs rounded py-2 px-3 text-center z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                                                left-1/2 -translate-x-1/2
                                            `}>
                                                <p className="font-bold">{milestone.name}</p>
                                                {isUnlocked ? (
                                                    <p className="text-yellow-400">Unlocked{unlockDate ? `: ${unlockDate}` : '!'}</p>
                                                ) : (
                                                    <p className="text-slate-400">Requires: {milestone.xp.toLocaleString()} XP</p>
                                                )}
                                                <div className="w-3 h-3 bg-slate-900 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Trophy Case</h2>
                        <div className="bg-secondary p-4 rounded-lg space-y-4">
                            {trophyCaseData.highestMilestone ? (
                                <div className="flex items-center bg-primary dark:bg-slate-700/50 p-3 rounded-lg">
                                    <TrophyIcon className="w-10 h-10 text-yellow-400 mr-4 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-text-secondary">Highest Achievement</p>
                                        <p className="text-lg font-bold text-text-primary">{trophyCaseData.highestMilestone.name}</p>
                                    </div>
                                </div>
                            ) : (
                                 <div className="flex items-center bg-primary dark:bg-slate-700/50 p-3 rounded-lg text-text-secondary">
                                    Start learning to earn your first badge!
                                </div>
                            )}
                             {trophyCaseData.latestMilestone && (
                                <div className="flex items-center bg-primary dark:bg-slate-700/50 p-3 rounded-lg">
                                    <TrophyIcon className="w-10 h-10 text-green-400 mr-4 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-text-secondary">Latest Unlock</p>
                                        <p className="text-lg font-bold text-text-primary">{trophyCaseData.latestMilestone.name}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center bg-primary dark:bg-slate-700/50 p-3 rounded-lg">
                                <FireIcon className="w-10 h-10 text-orange-400 mr-4 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-text-secondary">Study Streak</p>
                                    <p className="text-lg font-bold text-text-primary">{trophyCaseData.streak}-Day Streak</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Activity Log</h2>
                        <div className="bg-secondary p-4 rounded-lg">
                            <div className="flex space-x-2 mb-4 border-b border-slate-700 pb-3">
                                {(['all', 'milestone_unlocked', 'session'] as ActivityFilter[]).map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setActivityFilter(filter)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                                            activityFilter === filter
                                                ? 'bg-accent text-white'
                                                : 'bg-primary hover:bg-slate-300'
                                        }`}
                                    >
                                        {filter === 'milestone_unlocked' ? 'Milestones' : filter === 'session' ? 'Sessions' : 'All'}
                                    </button>
                                ))}
                            </div>
                            {Object.keys(groupedEvents).length > 0 ? (
                                <div className="space-y-6 max-h-80 overflow-y-auto pr-2">
                                    {/* FIX: Explicitly type the destructured arguments from Object.entries to prevent TypeScript from inferring 'events' as 'unknown' and causing a '.map is not a function' error. */}
                                    {Object.entries(groupedEvents).map(([date, events]: [string, RewardEvent[]]) => (
                                        <div key={date}>
                                            <h3 className="text-sm font-bold text-text-secondary mb-2">{date}</h3>
                                            <ul className="space-y-3">
                                                {events.map(event => {
                                                    const { icon: Icon, color, title } = eventDetails(event);
                                                    return (
                                                        <li key={event.id} className="flex items-start space-x-4 bg-primary p-3 rounded-lg">
                                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-secondary ${color}`}>
                                                                <Icon className="w-6 h-6" />
                                                            </div>
                                                            <div className="flex-grow">
                                                                <p className="font-bold text-text-primary">{title}</p>
                                                                <p className="text-sm text-text-primary">{event.description}</p>
                                                                <div className="flex justify-between items-center mt-1">
                                                                    <p className="text-xs text-text-secondary">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                    {event.xpChange !== 0 && (
                                                                        <span className={`font-bold text-sm ${event.xpChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                            {event.xpChange > 0 ? `+${event.xpChange} XP` : `${event.xpChange} XP`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                    <ClipboardListIcon className="w-10 h-10 text-slate-500 mb-2"/>
                                    <p className="text-text-secondary">No activity matching your filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RewardsPage;
