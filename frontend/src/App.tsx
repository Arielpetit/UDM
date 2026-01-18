import { useState, useEffect } from 'react';
import type { InventoryItemCreate } from './hooks/useInventory';
import type { InventoryItem } from './types/inventory';
import { useInventory } from './hooks/useInventory';
import { Dashboard } from './components/Dashboard';
import { InventoryTable } from './components/inventory/InventoryTable';
import { ItemDialog } from './components/inventory/ItemDialog';
import { SuppliersPage } from './components/suppliers/SuppliersPage';
import { ImportExport } from './components/inventory/ImportExport';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { AlertConfigDialog } from './components/alerts/AlertConfig';
import { PurchaseOrdersPage } from './components/orders/PurchaseOrdersPage';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  PlusCircle,
  Package2,
  LayoutDashboard,
  Package,
  Moon,
  Sun,
  Truck,
  BarChart3,
  Settings,
  ShoppingCart
} from "lucide-react";

type View = 'dashboard' | 'inventory' | 'suppliers' | 'analytics' | 'orders';

function App() {
  const { items, loading, error, addItem, updateItem, deleteItem } = useInventory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertConfigOpen, setAlertConfigOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Initialize dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

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
      setDialogOpen(false);
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

  const navigateToInventory = () => {
    setLowStockFilter(false);
    setCurrentView('inventory');
  };

  const navigateToLowStock = () => {
    setLowStockFilter(true);
    setCurrentView('inventory');
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Nav */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Package2 className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Inventory Tracker</h1>
              </div>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1">
                <Button
                  variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('dashboard')}
                  className="gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button
                  variant={currentView === 'inventory' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={navigateToInventory}
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  Inventory
                </Button>
                <Button
                  variant={currentView === 'suppliers' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('suppliers')}
                  className="gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Suppliers
                </Button>
                <Button
                  variant={currentView === 'orders' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('orders')}
                  className="gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </Button>
                <Button
                  variant={currentView === 'analytics' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('analytics')}
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAlertConfigOpen(true)}
                className="rounded-full"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-full"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <Button onClick={handleAddClick} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/15 p-4 text-destructive border border-destructive/30">
            {error}
          </div>
        )}

        {currentView === 'dashboard' ? (
          <Dashboard
            onNavigateToInventory={navigateToInventory}
            onNavigateToLowStock={navigateToLowStock}
          />
        ) : currentView === 'suppliers' ? (
          <SuppliersPage />
        ) : currentView === 'orders' ? (
          <PurchaseOrdersPage />
        ) : currentView === 'analytics' ? (
          <AnalyticsDashboard />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {lowStockFilter ? 'Low Stock Items' : 'All Inventory'}
              </h2>
              <div className="flex items-center gap-2">
                <ImportExport />
                {lowStockFilter && (
                  <Button variant="outline" size="sm" onClick={() => setLowStockFilter(false)}>
                    Show All Items
                  </Button>
                )}
              </div>
            </div>
            <InventoryTable
              items={items}
              onDelete={handleDelete}
              onEdit={handleEditClick}
              loading={loading}
              lowStockFilter={lowStockFilter}
            />
          </div>
        )}
      </main>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={editingItem}
      />
      <AlertConfigDialog
        open={alertConfigOpen}
        onOpenChange={setAlertConfigOpen}
      />
      <Toaster />
    </div>
  );
}

export default App;
