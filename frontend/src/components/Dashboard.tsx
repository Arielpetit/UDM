import { useEffect, useState } from 'react';
import { Package, DollarSign, AlertTriangle, XCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardStats {
    total_items: number;
    total_quantity: number;
    total_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
}

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
}

function KPICard({ title, value, icon, trend, variant = 'default' }: KPICardProps) {
    const variantStyles = {
        default: 'border-border/50',
        success: 'border-l-4 border-l-success',
        warning: 'border-l-4 border-l-warning',
        danger: 'border-l-4 border-l-danger',
    };

    return (
        <div className={`kpi-card ${variantStyles[variant]}`}>
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                    {trend && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {icon}
                </div>
            </div>
        </div>
    );
}

interface DashboardProps {
    onNavigateToInventory: () => void;
    onNavigateToLowStock: () => void;
}

export function Dashboard({ onNavigateToInventory, onNavigateToLowStock }: DashboardProps) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
            setError(null);
        } catch (err) {
            setError('Failed to load dashboard data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="kpi-card animate-pulse">
                        <div className="h-20 bg-muted rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="glass rounded-xl p-8 text-center">
                <p className="text-muted-foreground">{error || 'No data available'}</p>
                <Button onClick={fetchStats} className="mt-4">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Items"
                    value={stats.total_items}
                    icon={<Package className="h-6 w-6 text-primary" />}
                    variant="default"
                />
                <KPICard
                    title="Total Value"
                    value={`$${stats.total_value.toLocaleString()}`}
                    icon={<DollarSign className="h-6 w-6 text-success" />}
                    variant="success"
                />
                <KPICard
                    title="Low Stock"
                    value={stats.low_stock_count}
                    icon={<AlertTriangle className="h-6 w-6 text-warning" />}
                    variant="warning"
                />
                <KPICard
                    title="Out of Stock"
                    value={stats.out_of_stock_count}
                    icon={<XCircle className="h-6 w-6 text-danger" />}
                    variant="danger"
                />
            </div>

            {/* Quick Actions */}
            <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-4">
                    <Button onClick={onNavigateToInventory}>
                        <Package className="mr-2 h-4 w-4" />
                        View All Items
                    </Button>
                    {stats.low_stock_count > 0 && (
                        <Button variant="outline" onClick={onNavigateToLowStock} className="border-warning text-warning hover:bg-warning/10">
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            View Low Stock ({stats.low_stock_count})
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
