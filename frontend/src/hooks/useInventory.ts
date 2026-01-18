import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface InventoryItem {
    id: number;
    name: string;
    description?: string;
    quantity: number;
    price: number;
    category: string;
}

export interface InventoryItemCreate {
    name: string;
    description?: string;
    quantity: number;
    price: number;
    category: string;
}

export const useInventory = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = async () => {
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
    };

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

    const updateItem = async (id: number, item: Partial<InventoryItemCreate>) => {
        try {
            const response = await axios.put(`${API_URL}/items/${id}`, item);
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

    useEffect(() => {
        fetchItems();
    }, []);

    return { items, loading, error, fetchItems, addItem, updateItem, deleteItem };
};
