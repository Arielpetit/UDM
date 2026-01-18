import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Supplier } from '../types/inventory';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface SupplierCreate {
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    lead_time_days?: number;
    notes?: string;
}

export const useSuppliers = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/suppliers/`);
            setSuppliers(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch suppliers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const addSupplier = async (supplier: SupplierCreate) => {
        try {
            const response = await axios.post(`${API_URL}/suppliers/`, supplier);
            setSuppliers((prev) => [...prev, response.data]);
            return response.data;
        } catch (err) {
            setError('Failed to add supplier');
            throw err;
        }
    };

    const updateSupplier = async (id: number, supplier: Partial<SupplierCreate>) => {
        try {
            const response = await axios.put(`${API_URL}/suppliers/${id}`, supplier);
            setSuppliers((prev) => prev.map((s) => (s.id === id ? response.data : s)));
            return response.data;
        } catch (err) {
            setError('Failed to update supplier');
            throw err;
        }
    };

    const deleteSupplier = async (id: number) => {
        try {
            await axios.delete(`${API_URL}/suppliers/${id}`);
            setSuppliers((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            setError('Failed to delete supplier');
            throw err;
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    return {
        suppliers,
        loading,
        error,
        fetchSuppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier
    };
};
