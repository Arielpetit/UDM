import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const ImportExport: React.FC = () => {
    const [importOpen, setImportOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            toast.loading("Preparing export...");
            const response = await axios.get(`${API_URL}/items/export/csv`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.dismiss();
            toast.success("Export downloaded successfully");
        } catch (err) {
            toast.dismiss();
            toast.error("Failed to export inventory");
            console.error(err);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            toast.error("Please upload a CSV file");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploading(true);
            const response = await axios.post(`${API_URL}/items/import/csv`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setImportResult(response.data);
            toast.success(`Successfully imported ${response.data.imported} items`);
        } catch (err) {
            toast.error("Failed to import items");
            console.error(err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClose = () => {
        setImportOpen(false);
        setImportResult(null);
    };

    return (
        <>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                </Button>
                <Button variant="outline" onClick={handleExport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            <Dialog open={importOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[500px] glass">
                    <DialogHeader>
                        <DialogTitle>Import Inventory</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file to update or add inventory items.
                            The CSV should have headers: Name, Quantity, Price, Category.
                        </DialogDescription>
                    </DialogHeader>

                    {!importResult ? (
                        <div className="grid gap-4 py-4">
                            <div
                                className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                                ) : (
                                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
                                )}
                                <p className="text-sm font-medium">
                                    {uploading ? "Importing..." : "Click to upload CSV"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Max file size: 5MB
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <p className="font-semibold mb-1">Required Columns:</p>
                                <p>Name, Quantity, Price, Category</p>
                                <p className="font-semibold mt-2 mb-1">Optional Columns:</p>
                                <p>SKU, Description, Cost Price, Reorder Level, Supplier</p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 space-y-4">
                            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-4 rounded-lg">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">Import Completed</span>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm">
                                    Successfully processed: <span className="font-bold">{importResult.imported}</span> items
                                </p>

                                {importResult.errors.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Errors ({importResult.errors.length})
                                        </p>
                                        <div className="bg-destructive/10 rounded-md p-3 max-h-[150px] overflow-y-auto text-xs text-destructive space-y-1">
                                            {importResult.errors.map((err, i) => (
                                                <p key={i}>{err}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={handleClose}>
                            {importResult ? "Close" : "Cancel"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
