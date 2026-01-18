import React, { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/types/inventory";
import { Trash2, Pencil, Search, AlertTriangle, Loader2, History as HistoryIcon } from "lucide-react";
import { StockHistory } from "./StockHistory";

interface InventoryTableProps {
    items: InventoryItem[];
    onDelete: (id: number) => void;
    onEdit: (item: InventoryItem) => void;
    loading?: boolean;
    lowStockFilter?: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
    items,
    onDelete,
    onEdit,
    loading = false,
    lowStockFilter = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    // Filter items based on search and low stock filter
    const filteredItems = useMemo(() => {
        let result = items;

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    (item.sku && item.sku.toLowerCase().includes(query)) ||
                    item.category.toLowerCase().includes(query)
            );
        }

        // Apply low stock filter
        if (lowStockFilter) {
            result = result.filter((item) => item.quantity <= item.reorder_level);
        }

        return result;
    }, [items, searchQuery, lowStockFilter]);

    // Determine row styling based on stock level
    const getRowClassName = (item: InventoryItem) => {
        if (item.quantity === 0) return 'opacity-70 bg-destructive/5';
        if (item.quantity <= item.reorder_level) return 'bg-warning/5';
        return '';
    };

    const handleHistoryClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setHistoryOpen(true);
    };

    if (loading) {
        return (
            <div className="glass rounded-xl p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search by name, SKU, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass"
                />
            </div>

            {/* Table */}
            <div className="glass rounded-xl overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[100px]">SKU</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Reorder At</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right w-[140px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                                    <div className="space-y-2">
                                        <p className="text-lg font-medium">No items found</p>
                                        <p className="text-sm">
                                            {searchQuery
                                                ? 'Try a different search term'
                                                : 'Add some items to get started!'}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow key={item.id} className={`transition-smooth ${getRowClassName(item)}`}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {item.sku || '—'}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {item.name}
                                            {item.quantity <= item.reorder_level && (
                                                <AlertTriangle className="h-4 w-4 text-warning" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal">
                                            {item.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        <span className={item.quantity === 0 ? 'text-destructive' : item.quantity <= item.reorder_level ? 'text-warning' : ''}>
                                            {item.quantity}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {item.reorder_level}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${item.price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        ${(item.quantity * item.price).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleHistoryClick(item)}
                                                title="View History"
                                                className="h-8 w-8"
                                            >
                                                <HistoryIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(item)}
                                                className="h-8 w-8"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDelete(item.id)}
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Summary Footer */}
            {filteredItems.length > 0 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
                    <span>Showing {filteredItems.length} of {items.length} items</span>
                    <span>
                        Total Value: ${filteredItems.reduce((sum, item) => sum + item.quantity * item.price, 0).toLocaleString()}
                    </span>
                </div>
            )}

            <StockHistory
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                item={selectedItem}
            />
        </div>
    );
};
