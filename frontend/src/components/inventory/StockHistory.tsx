import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useInventory } from "@/hooks/useInventory";
import type { StockMovement, InventoryItem } from "@/types/inventory";
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, AlertTriangle } from 'lucide-react';

interface StockHistoryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: InventoryItem | null;
}

export const StockHistory: React.FC<StockHistoryProps> = ({
    open,
    onOpenChange,
    item,
}) => {
    const { getStockMovements } = useInventory();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && item) {
            const fetchMovements = async () => {
                setLoading(true);
                const data = await getStockMovements(item.id);
                setMovements(data);
                setLoading(false);
            };
            fetchMovements();
        }
    }, [open, item, getStockMovements]);

    const getMovementIcon = (type: string) => {
        switch (type) {
            case 'received':
            case 'returned':
                return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
            case 'sold':
            case 'damaged':
            case 'transferred':
                return <ArrowUpRight className="h-4 w-4 text-red-500" />;
            case 'adjusted':
                return <RefreshCw className="h-4 w-4 text-blue-500" />;
            default:
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getMovementColor = (type: string) => {
        switch (type) {
            case 'received': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'sold': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'adjusted': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'damaged': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] glass">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Stock History
                        {item && <span className="text-muted-foreground font-normal">- {item.name}</span>}
                    </DialogTitle>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Change</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Reason</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Loading history...
                                    </TableCell>
                                </TableRow>
                            ) : movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No movements recorded
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movements.map((movement) => (
                                    <TableRow key={movement.id}>
                                        <TableCell className="text-xs">
                                            {format(new Date(movement.created_at), 'MMM d, yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getMovementColor(movement.movement_type)}>
                                                <span className="flex items-center gap-1">
                                                    {getMovementIcon(movement.movement_type)}
                                                    {movement.movement_type}
                                                </span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={movement.quantity_change > 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                                            {movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {movement.quantity_after}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {movement.reason || "-"}
                                            {movement.reference_number && (
                                                <span className="block text-xs opacity-70">Ref: {movement.reference_number}</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
};
