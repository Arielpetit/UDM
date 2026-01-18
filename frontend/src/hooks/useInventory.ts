import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { InventoryItem, StockMovement } from '../types/inventory';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface InventoryItemCreate {
    name: string;
    description?: string;
    quantity: number;
    price: number;
    cost_price?: number;
    category: string;
    sku?: string;
    reorder_level?: number;
    supplier_id?: number;
}

export const useInventory = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/items/`);
            setItems(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch inventory items');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const addItem = async (item: InventoryItemCreate) => {
        try {
            const response = await axios.post(`${API_URL}/items/`, item);
            setItems((prev) => [...prev, response.data]);
            return response.data;
        } catch (err) {
            setError('Failed to add item');
            throw err;
        }
    };

    const updateItem = async (id: number, item: Partial<InventoryItemCreate>, reason?: string) => {
        try {
            const url = reason
                ? `${API_URL}/items/${id}?movement_reason=${encodeURIComponent(reason)}`
                : `${API_URL}/items/${id}`;

            const response = await axios.put(url, item);
            setItems((prev) => prev.map((i) => (i.id === id ? response.data : i)));
            return response.data;
        } catch (err) {
            setError('Failed to update item');
            throw err;
        }
    };

    const deleteItem = async (id: number) => {
        try {
            await axios.delete(`${API_URL}/items/${id}`);
            setItems((prev) => prev.filter((i) => i.id !== id));
        } catch (err) {
            setError('Failed to delete item');
            throw err;
        }
    };

    const getStockMovements = async (itemId: number): Promise<StockMovement[]> => {
        try {
            const response = await axios.get(`${API_URL}/items/${itemId}/movements`);
            return response.data;
        } catch (err) {
            console.error(err);
            return [];
        }
    };

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    return {
        items,
        loading,
        error,
        fetchItems,
        addItem,
        updateItem,
        deleteItem,
        getStockMovements
    };
};
