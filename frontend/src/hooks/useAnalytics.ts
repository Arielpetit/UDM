import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { DashboardStats, CategoryBreakdown } from '../types/inventory';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useAnalytics = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
    const [topItems, setTopItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, catRes, topRes] = await Promise.all([
                axios.get(`${API_URL}/stats`),
                axios.get(`${API_URL}/analytics/categories`),
                axios.get(`${API_URL}/analytics/top-items`)
            ]);

            setStats(statsRes.data);
            setCategoryData(catRes.data);
            setTopItems(topRes.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch analytics data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    return {
        stats,
        categoryData,
        topItems,
        loading,
        error,
        refetch: fetchAllData
    };
};
