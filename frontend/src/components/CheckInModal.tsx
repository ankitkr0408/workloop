'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface CheckInModalProps {
    projectId: string;
    projectName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CheckInModal({ projectId, projectName, onClose, onSuccess }: CheckInModalProps) {
    const [formData, setFormData] = useState({
        workedOn: '',
        planningToDo: '',
        blockers: '',
        hoursWorked: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/check-ins', {
                projectId,
                workedOn: formData.workedOn,
                planningToDo: formData.planningToDo,
                blockers: formData.blockers || undefined,
                hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit check-in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Daily Check-in</h2>
                    <p className="text-gray-600 mt-2">
                        60-second standup for <span className="font-medium">{projectName}</span>
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Question 1 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            What did you work on today? *
                        </label>
                        <textarea
                            value={formData.workedOn}
                            onChange={(e) => setFormData({ ...formData, workedOn: e.target.value })}
                            required
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                            placeholder="e.g., Implemented user authentication, fixed login bug, reviewed PR #123..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Be specific about tasks and accomplishments</p>
                    </div>

                    {/* Question 2 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            What are you planning to do tomorrow? *
                        </label>
                        <textarea
                            value={formData.planningToDo}
                            onChange={(e) => setFormData({ ...formData, planningToDo: e.target.value })}
                            required
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                            placeholder="e.g., Complete API integration, start working on dashboard UI, test deployment..."
                        />
                        <p className="text-xs text-gray-500 mt-1">What's your focus for tomorrow?</p>
                    </div>

                    {/* Question 3 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Any blockers or challenges?
                        </label>
                        <textarea
                            value={formData.blockers}
                            onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                            placeholder="e.g., Waiting for API access, need design feedback, stuck on deployment issue... (Optional)"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty if no blockers</p>
                    </div>

                    {/* Hours Worked */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Hours worked today (optional)
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={formData.hoursWorked}
                            onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="e.g., 8"
                        />
                        <p className="text-xs text-gray-500 mt-1">Helps track project progress over time</p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <div className="text-2xl">💡</div>
                            <div className="flex-1">
                                <p className="text-sm text-blue-900 font-medium">Why daily check-ins?</p>
                                <p className="text-sm text-blue-800 mt-1">
                                    Your updates keep clients informed and help the team stay aligned. Takes just 60 seconds!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Submitting...' : 'Submit Check-in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
