import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import axios from 'axios';
import { Bell, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AlertConfig {
    id?: number;
    email_enabled: boolean;
    email_recipient: string;
    low_stock_threshold_default: number;
    check_frequency_hours: number;
}

interface AlertConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AlertConfigDialog: React.FC<AlertConfigDialogProps> = ({
    open,
    onOpenChange,
}) => {
    const [loading, setLoading] = useState(false);
    const form = useForm<AlertConfig>({
        defaultValues: {
            email_enabled: false,
            email_recipient: "",
            low_stock_threshold_default: 10,
            check_frequency_hours: 24,
        },
    });

    useEffect(() => {
        if (open) {
            const fetchConfig = async () => {
                try {
                    setLoading(true);
                    const response = await axios.get(`${API_URL}/alerts/config`);
                    if (response.data) {
                        form.reset(response.data);
                    }
                } catch (err) {
                    console.error("Failed to fetch alert config", err);
                    // Don't show error toast here as it might just be 404 for first time
                } finally {
                    setLoading(false);
                }
            };
            fetchConfig();
        }
    }, [open, form]);

    const onSubmit = async (data: AlertConfig) => {
        try {
            setLoading(true);
            await axios.put(`${API_URL}/alerts/config`, data);
            toast.success("Alert settings updated");
            onOpenChange(false);
        } catch (err) {
            toast.error("Failed to update alert settings");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Alert Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure how and when you want to be notified about low stock.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4 rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Email Notifications</FormLabel>
                                    <FormDescription>
                                        Receive emails when items go below reorder level.
                                    </FormDescription>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="email_enabled"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {form.watch("email_enabled") && (
                                <FormField
                                    control={form.control}
                                    name="email_recipient"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Recipient Email</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-9" placeholder="alerts@example.com" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="low_stock_threshold_default"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Default Threshold</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            Global reorder level
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="check_frequency_hours"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Check Frequency</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                    Hours
                                                </span>
                                            </div>
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            How often to check
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : "Save Settings"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
