'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: 'owner' | 'admin' | 'member';
    avatarUrl?: string;
    onboardingCompleted: boolean;
}

interface Organization {
    id: string;
    name: string;
    slug: string;
    plan: string;
}

interface AuthContextType {
    user: User | null;
    organization: Organization | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (data: SignupData) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

interface SignupData {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
    organizationSlug: string;
    teamSize: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const loadUser = async () => {
            const storedUser = localStorage.getItem('user');
            const storedOrg = localStorage.getItem('organization');
            const accessToken = localStorage.getItem('accessToken');

            if (storedUser && accessToken) {
                setUser(JSON.parse(storedUser));
                if (storedOrg) {
                    setOrganization(JSON.parse(storedOrg));
                }

                // Verify token is still valid
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data.user);
                    setOrganization(response.data.organization);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    localStorage.setItem('organization', JSON.stringify(response.data.organization));
                } catch (error) {
                    // Token invalid, clear storage
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    localStorage.removeItem('organization');
                    setUser(null);
                    setOrganization(null);
                }
            }

            setLoading(false);
        };

        loadUser();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, organization, accessToken, refreshToken } = response.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('organization', JSON.stringify(organization));

            setUser(user);
            setOrganization(organization);
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    };

    const signup = async (data: SignupData) => {
        try {
            const response = await api.post('/auth/register', data);
            const { user, organization, accessToken, refreshToken } = response.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('organization', JSON.stringify(organization));

            setUser(user);
            setOrganization(organization);
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Signup failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('organization');
        setUser(null);
        setOrganization(null);
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data.user);
            setOrganization(response.data.organization);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('organization', JSON.stringify(response.data.organization));
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, organization, loading, login, signup, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
