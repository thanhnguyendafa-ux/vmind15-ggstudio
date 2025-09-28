import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StudySession } from '../types';
import { dataService } from '../services/dataService';
import { useData } from '../hooks/useData';

const SessionHistoryPage: React.FC = () => {
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [loading, setLoading] = useState(true);
    const { tables } = useData();

    useEffect(() => {
        const fetchSessions = async () => {
            setLoading(true);
            const data = await dataService.getStudySessions();
            setSessions(data);
            setLoading(false);
        };
        fetchSessions();
    }, []);

    if (loading) {
        return <div className="p-4 sm:p-6 text-center">Loading session history...</div>;
    }

    return (
        <div className="p-4 sm:p-6">
            <Link to="/stats" className="text-accent hover:underline mb-4 inline-block">&larr; Back to Stats</Link>
            <h1 className="text-3xl font-bold mb-6 text-text-primary">Study Session History</h1>
            {sessions.length === 0 ? (
                <div className="bg-secondary p-6 rounded-lg text-center">
                    <p className="text-text-secondary">No study sessions have been recorded yet.</p>
                    <Link to="/study" className="mt-4 inline-block bg-accent text-primary font-bold py-2 px-4 rounded-lg hover:bg-sky-400 transition-colors">
                        Start a New Session
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map(session => (
                        <div key={session.id} className="bg-secondary p-4 rounded-lg shadow-md">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-text-secondary">{new Date(session.createdAt).toLocaleString()}</p>
                                    <p className="font-bold text-lg text-text-primary mt-1">{session.tableNames.join(', ')}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${session.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {session.status}
                                </span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-600 flex justify-between items-center text-sm text-text-secondary">
                                <span>{session.wordCount} words</span>
                                <div className="flex flex-wrap gap-2">
                                    {session.modes.map(mode => (
                                        <span key={mode} className="bg-slate-700 px-2 py-0.5 rounded-md text-xs">{mode}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SessionHistoryPage;