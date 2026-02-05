'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardHeader from '@/components/DashboardHeader';
import api from '@/lib/api';
import Link from 'next/link';

interface Project {
    id: string;
    name: string;
    description?: string;
    clientName: string;
    clientEmail?: string;
    status: string;
    memberCount?: number;
    clientLink?: {
        uuid: string;
        url: string;
        label: string;
    };
    createdAt: string;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const router = useRouter();

    useEffect(() => {
        fetchProjects();
    }, [filter]);

    const fetchProjects = async () => {
        try {
            const params = filter !== 'all' ? `?status=${filter}` : '';
            const response = await api.get(`/projects${params}`);
            setProjects(response.data.projects || []);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700';
            case 'on_hold':
                return 'bg-yellow-100 text-yellow-700';
            case 'completed':
                return 'bg-blue-100 text-blue-700';
            case 'archived':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <DashboardHeader />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                            <p className="text-gray-600 mt-1">Manage your client projects</p>
                        </div>
                        <button
                            onClick={() => router.push('/projects/new')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                        >
                            + New Project
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="mb-6 flex items-center space-x-2">
                        {['all', 'active', 'on_hold', 'completed', 'archived'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${filter === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Projects Grid */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <p className="text-gray-500 mb-4">No projects found</p>
                            <button
                                onClick={() => router.push('/projects/new')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                            >
                                Create First Project
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}`}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition p-6 group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">
                                            {project.name}
                                        </h3>
                                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    {project.description && (
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex items-center text-sm">
                                            <span className="text-gray-500 w-20">Client:</span>
                                            <span className="text-gray-900 font-medium">{project.clientName}</span>
                                        </div>
                                        {project.clientEmail && (
                                            <div className="flex items-center text-sm">
                                                <span className="text-gray-500 w-20">Email:</span>
                                                <span className="text-gray-700">{project.clientEmail}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-sm">
                                            <span className="text-gray-500 w-20">Members:</span>
                                            <span className="text-gray-900 font-medium">{project.memberCount || 0}</span>
                                        </div>
                                    </div>

                                    {project.clientLink && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Client Dashboard</span>
                                                <span className="text-xs text-blue-600 font-medium">View →</span>
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </ProtectedRoute>
    );
}
