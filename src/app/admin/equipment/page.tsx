"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowLeft, Upload, Edit2, X, Check } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";

export default function EquipmentAdminPage() {
    const router = useRouter();
    const [equipment, setEquipment] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const [newEquipment, setNewEquipment] = useState({
        equipment_name: "",
        default_unit_cost: "",
        default_duration_unit: "Day",
        source: ""
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editEquipment, setEditEquipment] = useState({
        equipment_name: "",
        default_unit_cost: "",
        default_duration_unit: "Day",
        source: ""
    });

    useEffect(() => {
        const fetchEquipment = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role !== "admin") {
                router.push("/dashboards");
                return;
            }

            const { data, error } = await supabase
                .from("equipment_catalog")
                .select("*")
                .order("equipment_name", { ascending: true });

            if (!error && data) {
                setEquipment(data);
            }
            setLoading(false);
        };
        fetchEquipment();
    }, [router, supabase]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);

        const { data, error } = await supabase
            .from("equipment_catalog")
            .insert({
                equipment_name: newEquipment.equipment_name,
                default_unit_cost: parseFloat(newEquipment.default_unit_cost) || 0,
                default_duration_unit: newEquipment.default_duration_unit,
                source: newEquipment.source || null
            })
            .select()
            .single();

        if (error) {
            if (error.message.includes("could not find the 'source' column")) {
                alert("Database Update Required: The 'source' column is missing from the equipment_catalog table. Please run the `equipment_catalog_schema.sql` script in your Supabase SQL editor to add this column before continuing.");
            } else {
                alert("Error adding equipment: " + error.message);
            }
        } else if (data) {
            setEquipment([...equipment, data].sort((a, b) => a.equipment_name.localeCompare(b.equipment_name)));
            setNewEquipment({ equipment_name: "", default_unit_cost: "", default_duration_unit: "Day", source: "" });
        }
        setAdding(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will remove it from the catalog, but won't affect existing projects that used it.`)) return;

        const { error } = await supabase
            .from("equipment_catalog")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Error deleting equipment: " + error.message);
        } else {
            setEquipment(equipment.filter(e => e.id !== id));
        }
    };

    const startEditing = (item: any) => {
        if (!item.id) return; // Prevent editing items without ID
        setEditingId(item.id);
        setEditEquipment({
            equipment_name: item.equipment_name,
            default_unit_cost: item.default_unit_cost.toString(),
            default_duration_unit: item.default_duration_unit,
            source: item.source || ""
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;

        const { data, error } = await supabase
            .from("equipment_catalog")
            .update({
                equipment_name: editEquipment.equipment_name,
                default_unit_cost: parseFloat(editEquipment.default_unit_cost) || 0,
                default_duration_unit: editEquipment.default_duration_unit,
                source: editEquipment.source || null
            })
            .eq("id", editingId)
            .select()
            .single();

        if (error) {
            alert("Error updating equipment: " + error.message);
        } else if (data) {
            setEquipment(equipment.map(e => e.id === editingId ? data : e).sort((a, b) => a.equipment_name.localeCompare(b.equipment_name)));
            setEditingId(null);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as any[];
                let successCount = 0;
                let errorCount = 0;

                for (const row of rows) {
                    try {
                        const name = row['Name'] || row['Equipment Name'] || row['equipment_name'];
                        const cost = row['Cost'] || row['Unit Cost'] || row['default_unit_cost'] || 0;
                        const duration = row['Unit'] || row['Duration Unit'] || row['default_duration_unit'] || 'Day';
                        const source = row['Source'] || row['Provider'] || row['source'] || null;

                        if (name) {
                            const { error } = await supabase
                                .from("equipment_catalog")
                                .upsert({
                                    equipment_name: name,
                                    default_unit_cost: parseFloat(cost) || 0,
                                    default_duration_unit: duration,
                                    source: source
                                }, { onConflict: 'equipment_name' });

                            if (error) errorCount++;
                            else successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (err) {
                        errorCount++;
                    }
                }

                alert(`CSV Import Complete:\nSuccessfully processed: ${successCount}\nErrors/Skipped: ${errorCount}`);

                // Refresh list
                const { data } = await supabase
                    .from("equipment_catalog")
                    .select("*")
                    .order("equipment_name", { ascending: true });
                if (data) setEquipment(data);

                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            },
            error: (error) => {
                alert("Error parsing CSV: " + error.message);
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        });
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50 p-12 text-center text-gray-500">Loading equipment catalog...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2">
                            <ArrowLeft size={16} className="mr-1" /> Back to Admin
                        </Link>
                        <h1 className="text-3xl font-extrabold text-gray-900">Manage Equipment Catalog</h1>
                        <p className="mt-1 text-sm text-gray-500">Add, edit, or import equipment for the project scope picklist.</p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full sm:w-auto flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            {uploading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload className="mr-2" size={16} />}
                            {uploading ? "Importing..." : "Import CSV"}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-primary" /> Add New Equipment
                        </h2>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                            <div className="lg:col-span-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Equipment Name <span className="text-red-500">*</span></label>
                                <input type="text" required value={newEquipment.equipment_name} onChange={e => setNewEquipment({ ...newEquipment, equipment_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-primary focus:border-primary text-black" placeholder="e.g. Mini Excavator" />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Default Unit Cost</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">$</span>
                                    <input type="number" step="0.01" min="0" value={newEquipment.default_unit_cost} onChange={e => setNewEquipment({ ...newEquipment, default_unit_cost: e.target.value })} className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-primary focus:border-primary text-black" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Duration Unit</label>
                                <select value={newEquipment.default_duration_unit} onChange={e => setNewEquipment({ ...newEquipment, default_duration_unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-primary focus:border-primary text-black">
                                    <option value="Day">Day</option>
                                    <option value="Week">Week</option>
                                    <option value="Month">Month</option>
                                </select>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Source / Provider</label>
                                <input type="text" value={newEquipment.source} onChange={e => setNewEquipment({ ...newEquipment, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-primary focus:border-primary text-black" placeholder="e.g. Sunbelt Rentals" />
                            </div>
                            <div className="lg:col-span-2">
                                <button type="submit" disabled={adding} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors h-[38px] items-center">
                                    {adding ? <Loader2 size={16} className="animate-spin" /> : "Add to Catalog"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Equipment Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Cost</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Duration Unit</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Source</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {equipment.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 italic">
                                            No equipment found in the catalog. Add one above or import a CSV file.
                                            <div className="mt-2 text-xs text-gray-400">
                                                Expected CSV format requires one of these columns for the name: 'Name', 'Equipment Name', 'equipment_name'
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    equipment.map((item, index) => (
                                        editingId === item.id ? (
                                            <tr key={`edit-${item.id}`} className="bg-blue-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <input type="text" value={editEquipment.equipment_name} onChange={e => setEditEquipment({ ...editEquipment, equipment_name: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-black" />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-sm">$</span>
                                                        <input type="number" step="0.01" value={editEquipment.default_unit_cost} onChange={e => setEditEquipment({ ...editEquipment, default_unit_cost: e.target.value })} className="w-24 pl-6 pr-2 py-1 border border-blue-300 rounded text-sm text-black" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <select value={editEquipment.default_duration_unit} onChange={e => setEditEquipment({ ...editEquipment, default_duration_unit: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-black">
                                                        <option value="Day">Day</option>
                                                        <option value="Week">Week</option>
                                                        <option value="Month">Month</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <input type="text" value={editEquipment.source} onChange={e => setEditEquipment({ ...editEquipment, source: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-black" />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800 p-1 bg-green-100 rounded">
                                                            <Check size={18} />
                                                        </button>
                                                        <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700 p-1 bg-gray-200 rounded">
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={item.id || index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.equipment_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(item.default_unit_cost).toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.default_duration_unit}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.source || <span className="text-gray-300 italic">None specified</span>}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {item.id && (
                                                            <button onClick={() => startEditing(item)} className="text-blue-500 hover:text-blue-700">
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(item.id, item.equipment_name)} className="text-red-500 hover:text-red-700">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
