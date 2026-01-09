import { useState } from 'react';
import type { InventoryItem, InventoryItemCreate } from './hooks/useInventory';
import { useInventory } from './hooks/useInventory';
import { InventoryTable } from './components/inventory/InventoryTable';
import { ItemDialog } from './components/inventory/ItemDialog';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { PlusCircle, Package2, Loader2 } from "lucide-react";

function App() {
  const { items, loading, error, addItem, updateItem, deleteItem } = useInventory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleAddClick = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: InventoryItemCreate) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, data);
        toast.success("Item updated successfully");
      } else {
        await addItem(data);
        toast.success("Item added successfully");
      }
    } catch (err) {
      toast.error("An error occurred");
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteItem(id);
        toast.success("Item deleted");
      } catch (err) {
        toast.error("Failed to delete item");
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Inventory Tracker</h1>
          </div>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </header>

        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <InventoryTable
            items={items}
            onDelete={handleDelete}
            onEdit={handleEditClick}
          />
        )}

        <ItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          initialData={editingItem}
        />
        <Toaster />
      </div>
    </div>
  );
}

export default App;
