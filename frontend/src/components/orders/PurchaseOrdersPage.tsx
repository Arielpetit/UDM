import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Search,
    CheckCircle2,
    FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { PurchaseOrderDialog } from "./PurchaseOrderDialog";
import { toast } from "sonner";
import { format } from 'date-fns';
import type { PurchaseOrderCreate } from "@/types/inventory";

export function PurchaseOrdersPage() {
    const { orders, loading, createOrder, receiveOrder } = usePurchaseOrders();
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    const filteredOrders = orders.filter(o =>
        o.po_number.toLowerCase().includes(search.toLowerCase()) ||
        o.supplier?.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async (data: PurchaseOrderCreate) => {
        try {
            await createOrder(data);
            toast.success("Purchase order created");
            setDialogOpen(false);
        } catch (err) {
            toast.error("Failed to create purchase order");
        }
    };

    const handleReceive = async (id: number) => {
        if (confirm("Mark this order as received? This will update inventory stock.")) {
            try {
                await receiveOrder(id);
                toast.success("Order received and inventory updated");
            } catch (err) {
                toast.error("Failed to receive order");
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'received': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Purchase Orders</h2>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Order
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search orders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 glass"
                />
            </div>

            {/* Table */}
            <div className="rounded-md border glass">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No orders found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono font-medium">
                                        {order.po_number}
                                    </TableCell>
                                    <TableCell>
                                        {order.supplier?.name || "Unknown Supplier"}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getStatusColor(order.status)}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${order.total_amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {order.status === 'pending' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleReceive(order.id)}
                                                    className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                                    title="Mark as Received"
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                                    Receive
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="View Details"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <PurchaseOrderDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleCreate}
            />
        </div>
    );
}
