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
import { Input } from "@/components/ui/input";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Phone,
    Mail,
    MapPin,
    Clock
} from "lucide-react";
import { useSuppliers, type SupplierCreate } from "@/hooks/useSuppliers";
import { SupplierDialog } from "./SupplierDialog";
import { toast } from "sonner";
import type { Supplier } from "@/types/inventory";

export function SuppliersPage() {
    const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddClick = () => {
        setEditingSupplier(null);
        setDialogOpen(true);
    };

    const handleEditClick = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setDialogOpen(true);
    };

    const handleDeleteClick = async (id: number) => {
        if (confirm("Are you sure you want to delete this supplier?")) {
            try {
                await deleteSupplier(id);
                toast.success("Supplier deleted");
            } catch (err) {
                toast.error("Failed to delete supplier");
            }
        }
    };

    const handleSubmit = async (data: SupplierCreate) => {
        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, data);
                toast.success("Supplier updated");
            } else {
                await addSupplier(data);
                toast.success("Supplier added");
            }
            setDialogOpen(false);
        } catch (err) {
            toast.error("Operation failed");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Suppliers</h2>
                <Button onClick={handleAddClick} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Supplier
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search suppliers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <div className="rounded-md border glass">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Lead Time</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredSuppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No suppliers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSuppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">
                                        {supplier.name}
                                        {supplier.address && (
                                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                <MapPin className="h-3 w-3 mr-1" />
                                                {supplier.address}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {supplier.contact_name || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1 text-sm">
                                            {supplier.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    {supplier.email}
                                                </div>
                                            )}
                                            {supplier.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    {supplier.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            {supplier.lead_time_days} days
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditClick(supplier)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteClick(supplier.id)}
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

            <SupplierDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                initialData={editingSupplier}
            />
        </div>
    );
}
