export interface Supplier {
    id: number;
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    lead_time_days: number;
    notes?: string;
}

export interface InventoryItem {
    id: number;
    sku?: string;
    name: string;
    description?: string;
    quantity: number;
    price: number;
    cost_price: number;
    category: string;
    reorder_level: number;
    supplier_id?: number;
    supplier?: Supplier;
    created_at?: string;
    updated_at?: string;
}

export interface StockMovement {
    id: number;
    item_id: number;
    quantity_change: number;
    quantity_before: number;
    quantity_after: number;
    movement_type: 'received' | 'sold' | 'adjusted' | 'returned' | 'damaged' | 'transferred';
    reason?: string;
    reference_number?: string;
    created_at: string;
    created_by?: string;
}

export interface DashboardStats {
    total_items: number;
    total_quantity: number;
    total_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
}

export interface CategoryBreakdown {
    category: string;
    item_count: number;
    total_value: number;
    total_quantity: number;
}

export interface PurchaseOrderItem {
    id: number;
    item_id: number;
    quantity_ordered: number;
    quantity_received: number;
    unit_price: number;
    item?: InventoryItem;
}

export interface PurchaseOrder {
    id: number;
    po_number: string;
    supplier_id: number;
    status: 'draft' | 'pending' | 'received' | 'cancelled';
    total_amount: number;
    notes?: string;
    expected_delivery?: string;
    received_at?: string;
    created_at: string;
    updated_at: string;
    items: PurchaseOrderItem[];
    supplier?: Supplier;
}

export interface PurchaseOrderCreate {
    supplier_id: number;
    items: {
        item_id: number;
        quantity_ordered: number;
        unit_price: number;
    }[];
    notes?: string;
    expected_delivery?: string;
    status?: string;
}



