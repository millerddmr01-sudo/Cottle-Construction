"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, ExternalLink, FileUp } from "lucide-react";

export default function ChangeOrderManagement({ projectId, userRole, supabase }: { projectId: string, userRole: string, supabase: any }) {
    const [changeOrders, setChangeOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const canEdit = userRole === 'admin' || userRole === 'foreman';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newChangeOrder, setNewChangeOrder] = useState({
        name: "",
        details: "",
        file: null as File | null
    });

    useEffect(() => {
        let isMounted = true;
        const fetchChangeOrders = async () => {
            const { data } = await supabase
                .from("project_change_orders")
                .select("*")
                .eq("project_id", projectId)
                .order("created_at", { ascending: true });

            if (isMounted) {
                setChangeOrders(data || []);
                setLoading(false);
            }
        };
        fetchChangeOrders();
        return () => { isMounted = false; };
    }, [projectId, supabase]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setNewChangeOrder({ ...newChangeOrder, file: e.target.files[0] });
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChangeOrder.file) {
            alert("A change order document is required.");
            return;
        }
        setAdding(true);

        const fileExt = newChangeOrder.file.name.split('.').pop();
        const fileName = `${projectId}/change-orders/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('project_files')
            .upload(fileName, newChangeOrder.file);

        if (uploadError) {
            alert("Error uploading file to storage: " + uploadError.message);
            setAdding(false);
            return;
        }

        // 2. Insert into Database
        const { data, error } = await supabase
            .from("project_change_orders")
            .insert({
                project_id: projectId,
                name: newChangeOrder.name,
                details: newChangeOrder.details,
                file_path: fileName
            })
            .select()
            .single();

        if (error) {
            alert("Error adding change order: " + error.message);
            // Optionally, delete the uploaded file here to clean up
            await supabase.storage.from("project_files").remove([fileName]);
        } else {
            setChangeOrders([...changeOrders, data]);
            setNewChangeOrder({ name: "", details: "", file: null });
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setAdding(false);
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm("Remove this change order?")) return;

        // Clean up file storage
        if (filePath) await supabase.storage.from("project_files").remove([filePath]);

        const { error } = await supabase
            .from("project_change_orders")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Error deleting change order: " + error.message);
        } else {
            setChangeOrders(changeOrders.filter((c: any) => c.id !== id));
        }
    };

    const handleViewDocument = async (path: string) => {
        const { data, error } = await supabase.storage.from('project_files').createSignedUrl(path, 60 * 60); // 1 hour expiry
        if (data && data.signedUrl) {
            window.open(data.signedUrl, '_blank');
        } else {
            alert("Could not open file: " + (error?.message || 'Unknown error'));
        }
    };

    if (loading) return <div className="text-sm text-gray-500 flex items-center"><Loader2 size={16} className="animate-spin mr-2" /> Loading change orders...</div>;

    return (
        <div className="space-y-4">
            {/* Change Orders List */}
            {changeOrders.length > 0 ? (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                    <ul className="divide-y divide-gray-200 bg-white">
                        {changeOrders.map((co) => (
                            <li key={co.id} className="p-4 hover:bg-gray-50 flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 text-sm mb-1">{co.name}</h4>
                                    <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap">{co.details}</p>
                                    {co.file_path && (
                                        <button onClick={() => handleViewDocument(co.file_path)} className="inline-flex items-center gap-1.5 mt-2 text-primary hover:text-primary/80 font-bold text-xs focus:outline-none">
                                            <ExternalLink size={14} /> View Document
                                        </button>
                                    )}
                                </div>
                                {canEdit && (
                                    <button onClick={() => handleDelete(co.id, co.file_path)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 border border-gray-100 flex items-center justify-center italic">
                    No change orders added yet.
                </div>
            )}

            {/* Add New Change Order Form */}
            {canEdit && (
                <form onSubmit={handleAdd} className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Plus size={16} className="text-primary" /> Add Change Order</h4>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name <span className="text-red-500">*</span></label>
                            <input type="text" required value={newChangeOrder.name} onChange={e => setNewChangeOrder({ ...newChangeOrder, name: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="E.g., Addition of back deck..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Details <span className="text-red-500">*</span></label>
                            <textarea required value={newChangeOrder.details} onChange={e => setNewChangeOrder({ ...newChangeOrder, details: e.target.value })} rows={2} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="Description of the change order..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1.5">Change Order Document <span className="text-red-500">*</span></label>
                            <input
                                type="file"
                                required
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                        </div>
                        <div className="mt-2 text-right">
                            <button type="submit" disabled={adding || !newChangeOrder.file} className="px-6 py-1.5 inline-flex items-center justify-center gap-1 bg-primary text-white rounded-md text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
                                {adding ? <Loader2 size={16} className="animate-spin" /> : "Save Change Order"}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
