'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardHeader from '@/components/DashboardHeader';
import api from '@/lib/api';

interface Project {
    id: string;
    name: string;
    description?: string;
    clientName: string;
    clientEmail?: string;
    status: string;
    clientLink?: {
        uuid: string;
        url: string;
        label: string;
        accessCount: number;
    };
    members: Array<{
        userId: string;
        userName: string;
        userAvatar?: string;
        role: string;
    }>;
    createdAt: string;
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
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchProjectDetails();
            fetchActivities();
        }
    }, [params.id]);

    const fetchProjectDetails = async () => {
        try {
            const response = await api.get(`/projects/${params.id}`);
            setProject(response.data);
        } catch (error) {
            console.error('Failed to fetch project:', error);
            router.push('/projects');
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const response = await api.get(`/activities?projectId=${params.id}&limit=20`);
            setActivities(response.data.activities || []);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        }
    };

    const copyClientLink = () => {
        if (project?.clientLink) {
            navigator.clipboard.writeText(project.clientLink.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                    <DashboardHeader />
                    <div className="flex items-center justify-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    if (!project) {
        return null;
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <DashboardHeader />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.push('/projects')}
                            className="text-sm text-gray-600 hover:text-gray-900 mb-4"
                        >
                            ← Back to Projects
                        </button>
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                                <p className="text-gray-600 mt-1">{project.clientName}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                {project.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Client Dashboard Link */}
                            {project.clientLink && (
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold">Client Dashboard Link</h2>
                                            <p className="text-blue-100 text-sm mt-1">
                                                Share this link with {project.clientName} for transparent project updates
                                            </p>
                                        </div>
                                        <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                                            {project.clientLink.accessCount || 0} views
                                        </span>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                                        <p className="text-sm font-mono text-blue-50 mb-3 break-all">
                                            {project.clientLink.url}
                                        </p>
                                        <button
                                            onClick={copyClientLink}
                                            className="w-full bg-white text-blue-600 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
                                        >
                                            {copied ? '✓ Copied!' : 'Copy Link'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Project Description */}
                            {project.description && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-lg font-bold text-gray-900 mb-3">Description</h2>
                                    <p className="text-gray-700">{project.description}</p>
                                </div>
                            )}

                            {/* Activity Timeline */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="p-6 border-b border-gray-100">
                                    <h2 className="text-lg font-bold text-gray-900">Activity Timeline</h2>
                                </div>
                                <div className="p-6">
                                    {activities.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">No activity yet</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {activities.map((activity) => (
                                                <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
                                                    <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                                                    <div className="flex-1">
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

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Project Info */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Project Info</h2>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">Client Email</p>
                                        <p className="text-sm text-gray-900 mt-1">
                                            {project.clientEmail || 'Not provided'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Created</p>
                                        <p className="text-sm text-gray-900 mt-1">{formatDate(project.createdAt)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
                                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                        + Add
                                    </button>
                                </div>
                                {project.members.length === 0 ? (
                                    <p className="text-sm text-gray-500">No members yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {project.members.map((member) => (
                                            <div key={member.userId} className="flex items-center space-x-3">
                                                {member.userAvatar ? (
                                                    <img
                                                        src={member.userAvatar}
                                                        alt={member.userName}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                                        {member.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{member.userName}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
