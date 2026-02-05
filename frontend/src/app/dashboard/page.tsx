'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardHeader from '@/components/DashboardHeader';
import api from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
    totalProjects: number;
    totalHours: number;
    totalCommits: number;
    totalCheckIns: number;
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
    activityDate: string;
    createdAt: string;
}

interface Project {
    id: string;
    name: string;
    clientName: string;
    status: string;
    memberCount?: number;
    createdAt: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats>({
        totalProjects: 0,
        totalHours: 0,
        totalCommits: 0,
        totalCheckIns: 0,
    });
    const [activities, setActivities] = useState<Activity[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch projects
                const projectsRes = await api.get('/projects?status=active');
                const projectsData = projectsRes.data.projects || [];
                setProjects(projectsData);

                // Fetch recent activities
                const activitiesRes = await api.get('/activities?limit=10');
                setActivities(activitiesRes.data.activities || []);

                // Fetch check-ins for stats
                const checkInsRes = await api.get('/check-ins?limit=100');
                const checkIns = checkInsRes.data.checkIns || [];

                // Calculate stats
                const totalHours = checkIns.reduce((sum: number, c: any) => sum + (c.hoursWorked || 0), 0);
                const totalCommits = activitiesRes.data.activities?.filter((a: Activity) => a.type === 'commit').length || 0;

                setStats({
                    totalProjects: projectsData.length,
                    totalHours,
                    totalCommits,
                    totalCheckIns: checkIns.length,
                });
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
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

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <DashboardHeader />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Welcome back, {user?.fullName?.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-gray-600 mt-1">Here's what's happening with your projects</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Active Projects</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProjects}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl">
                                    📊
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Hours</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHours}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl">
                                    ⏱️
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Commits</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCommits}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-2xl">
                                    💻
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Check-ins</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCheckIns}</p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center text-2xl">
                                    ✅
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Activity */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="p-6 border-b border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                                </div>
                                <div className="p-6">
                                    {loading ? (
                                        <div className="text-center py-8 text-gray-500">Loading...</div>
                                    ) : activities.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            No activity yet. Start by creating a project!
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {activities.map((activity) => (
                                                <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                                    <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{activity.user.name}</p>
                                                                <p className="text-sm text-gray-600 mt-0.5">{activity.title}</p>
                                                                {activity.description && (
                                                                    <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                                                                {formatDate(activity.activityDate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Active Projects */}
                        <div>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900">Projects</h2>
                                    <Link
                                        href="/projects/new"
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        + New
                                    </Link>
                                </div>
                                <div className="p-6">
                                    {loading ? (
                                        <div className="text-center py-8 text-gray-500">Loading...</div>
                                    ) : projects.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500 mb-3">No projects yet</p>
                                            <Link
                                                href="/projects/new"
                                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                            >
                                                Create First Project
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {projects.slice(0, 5).map((project) => (
                                                <Link
                                                    key={project.id}
                                                    href={`/projects/${project.id}`}
                                                    className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition"
                                                >
                                                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{project.clientName}</p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-xs text-gray-500">
                                                            {project.memberCount || 0} members
                                                        </span>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${project.status === 'active'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {project.status}
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                            {projects.length > 5 && (
                                                <Link
                                                    href="/projects"
                                                    className="block text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    View all {projects.length} projects →
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
