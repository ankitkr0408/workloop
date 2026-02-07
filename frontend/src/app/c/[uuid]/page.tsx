'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Stats {
    totalCommits: number;
    totalHours: number;
    totalCheckIns: number;
    activeMembers: number;
    period: string;
}

interface Activity {
    id: string;
    type: string;
    title: string;
    description?: string;
    user: {
        name: string;
        avatar?: string;
    };
    timestamp: string;
}

interface CheckIn {
    id: string;
    user: {
        name: string;
        avatar?: string;
    };
    workedOn: string;
    planningToDo: string;
    hoursWorked?: number;
    date: string;
}

interface WeeklyReport {
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    pdfUrl: string;
    stats: {
        totalHours: number;
        totalCommits: number;
    };
}

interface DailyStat {
    date: string;
    hours: number;
    commits: number;
}

interface ClientDashboardData {
    project: {
        name: string;
        description?: string;
        clientName: string;
    };
    stats: Stats;
    dailyStats: DailyStat[];
    reports: WeeklyReport[];
    activities: Activity[];
    checkIns: CheckIn[];
    accessedAt: string;
}

export default function ClientDashboardPage() {
    const params = useParams();
    const uuid = params.uuid as string;
    const [data, setData] = useState<ClientDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (uuid) {
            fetchDashboard();
        }
    }, [uuid]);

    const fetchDashboard = async () => {
        try {
            const response = await axios.get(`${API_URL}/client/${uuid}`);
            setData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatChartDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'commit':
                return '💻';
            case 'calendar':
                return '📅';
            case 'check_in':
                return '✅';
            case 'manual':
                return '📝';
            default:
                return '📌';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600 mb-6">
                        {error || 'This dashboard link is invalid or has been revoked.'}
                    </p>
                    <div className="text-sm text-gray-500">
                        If you believe this is an error, please contact your project manager.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-12">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{data.project.name}</h1>
                            <p className="text-sm text-gray-600">Client Dashboard for {data.project.clientName}</p>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                            <span className="block">Last updated</span>
                            <span className="font-medium">{new Date(data.accessedAt).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Project Description */}
                {data.project.description && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-blue-100 p-6">
                        <p className="text-gray-700 leading-relaxed">{data.project.description}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 transform transition hover:scale-105 duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Code Updates</p>
                                <p className="text-4xl font-bold text-indigo-600 mt-2">{data.stats.totalCommits}</p>
                                <p className="text-xs text-gray-500 mt-1">Last {data.stats.period}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-2xl">
                                💻
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 transform transition hover:scale-105 duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Hours Logged</p>
                                <p className="text-4xl font-bold text-green-600 mt-2">{data.stats.totalHours}</p>
                                <p className="text-xs text-gray-500 mt-1">Last {data.stats.period}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">
                                ⏱️
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 transform transition hover:scale-105 duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Daily Updates</p>
                                <p className="text-4xl font-bold text-yellow-600 mt-2">{data.stats.totalCheckIns}</p>
                                <p className="text-xs text-gray-500 mt-1">Last {data.stats.period}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center text-2xl">
                                ✅
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 transform transition hover:scale-105 duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Active Team</p>
                                <p className="text-4xl font-bold text-blue-600 mt-2">{data.stats.activeMembers}</p>
                                <p className="text-xs text-gray-500 mt-1">This week</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl">
                                👥
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Chart & Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Weekly Progress Chart */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Weekly Progress</h2>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data.dailyStats}
                                    margin={{
                                        top: 5,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatChartDate}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        orientation="left"
                                        stroke="#4F46E5"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="#10B981"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="commits" name="Code Commits" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="hours" name="Hours Logged" fill="#10B981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Weekly Reports List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Reports</h2>
                        <div className="overflow-y-auto max-h-80 pr-2 space-y-3">
                            {data.reports && data.reports.length > 0 ? (
                                data.reports.map((report) => (
                                    <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-red-100 text-red-600 p-2 rounded-lg">
                                                📄
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Week of {new Date(report.weekStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {report.stats.totalHours}h • {report.stats.totalCommits} commits
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={report.pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Download
                                        </a>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <p>No reports available yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Recent Activity */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                                <p className="text-sm text-gray-500 mt-1">What the team has been working on</p>
                            </div>
                            <div className="p-6">
                                {data.activities.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No recent activity</p>
                                ) : (
                                    <div className="space-y-4">
                                        {data.activities.map((activity) => (
                                            <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                                <div className="text-2xl mt-0.5">{getActivityIcon(activity.type)}</div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{activity.user.name}</p>
                                                    <p className="text-sm text-gray-700 mt-0.5">{activity.title}</p>
                                                    {activity.description && (
                                                        <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Daily Check-ins */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">Daily Updates</h2>
                                <p className="text-sm text-gray-500 mt-1">Team check-ins</p>
                            </div>
                            <div className="p-6 max-h-[600px] overflow-y-auto">
                                {data.checkIns.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No check-ins yet</p>
                                ) : (
                                    <div className="space-y-4">
                                        {data.checkIns.map((checkIn) => (
                                            <div key={checkIn.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    {checkIn.user.avatar ? (
                                                        <img
                                                            src={checkIn.user.avatar}
                                                            alt={checkIn.user.name}
                                                            className="w-8 h-8 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                            {checkIn.user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{checkIn.user.name}</p>
                                                        <p className="text-xs text-gray-500">{formatDate(checkIn.date)}</p>
                                                    </div>
                                                    {checkIn.hoursWorked && (
                                                        <span className="text-xs text-gray-500">{checkIn.hoursWorked}h</span>
                                                    )}
                                                </div>
                                                <div className="ml-10 space-y-2">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
                                                        <p className="text-sm text-gray-700 mt-0.5">{checkIn.workedOn}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500 uppercase">Next Up</p>
                                                        <p className="text-sm text-gray-700 mt-0.5">{checkIn.planningToDo}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center pb-8">
                    <p className="text-sm text-gray-600">
                        This dashboard is powered by{' '}
                        <span className="font-semibold text-blue-600">WorkLoop</span>
                    </p>
                </div>
            </main>
        </div>
    );
}
