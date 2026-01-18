import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { PurchaseOrder, PurchaseOrderCreate } from '../types/inventory';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const usePurchaseOrders = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/purchase-orders/`);
            setOrders(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch purchase orders');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const createOrder = async (order: PurchaseOrderCreate) => {
        try {
            const response = await axios.post(`${API_URL}/purchase-orders/`, order);
            setOrders(prev => [response.data, ...prev]);
            return response.data;
        } catch (err) {
            setError('Failed to create purchase order');
            throw err;
        }
    };

    const updateOrder = async (id: number, order: Partial<PurchaseOrderCreate>) => {
        try {
            const response = await axios.put(`${API_URL}/purchase-orders/${id}`, order);
            setOrders(prev => prev.map(o => o.id === id ? response.data : o));
            return response.data;
        } catch (err) {
            setError('Failed to update purchase order');
            throw err;
        }
    };

    const deleteOrder = async (id: number) => {
        try {
            await axios.delete(`${API_URL}/purchase-orders/${id}`);
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (err) {
            setError('Failed to delete purchase order');
            throw err;
        }
    };

    const receiveOrder = async (id: number) => {
        try {
            const response = await axios.post(`${API_URL}/purchase-orders/${id}/receive`);
            setOrders(prev => prev.map(o => o.id === id ? response.data : o));
            return response.data;
        } catch (err) {
            setError('Failed to receive purchase order');
            throw err;
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return {
        orders,
        loading,
        error,
        createOrder,
        updateOrder,
        deleteOrder,
        receiveOrder,
        refetch: fetchOrders
    };
};
