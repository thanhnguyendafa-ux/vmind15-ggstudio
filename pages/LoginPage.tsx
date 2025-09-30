
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signIn } = useData();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await signIn(email, password);
            navigate('/settings');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-primary dark:bg-slate-900 p-4">
            <div className="w-full max-w-md bg-secondary dark:bg-slate-800 p-8 rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-center text-text-primary dark:text-slate-200 mb-6">Login to Vmind</h1>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-secondary dark:text-slate-400">Email Address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full bg-primary dark:bg-slate-700 p-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-accent dark:focus:ring-sky-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"  className="block text-sm font-medium text-text-secondary dark:text-slate-400">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full bg-primary dark:bg-slate-700 p-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-accent dark:focus:ring-sky-500 focus:outline-none"
                        />
                    </div>
                    {error && <p className="text-sm text-danger text-center">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-bold text-white bg-accent hover:bg-accent-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-darker disabled:bg-slate-500 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                    </div>
                </form>
                <p className="mt-6 text-center text-sm text-text-secondary dark:text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-medium text-accent hover:text-accent-darker">
                        Sign up
                    </Link>
                </p>
                 <p className="mt-4 text-center text-sm text-text-secondary dark:text-slate-400">
                    <Link to="/" className="font-medium text-accent hover:text-accent-darker">
                        &larr; Back to Home
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
