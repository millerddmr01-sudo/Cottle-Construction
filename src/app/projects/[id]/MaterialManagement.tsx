"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Calculator } from "lucide-react";

export default function MaterialManagement({ projectId, userRole, supabase }: { projectId: string, userRole: string, supabase: any }) {
    const [materials, setMaterials] = useState<any[]>([]);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const canManageCosts = userRole === 'admin' || userRole === 'foreman';
    const canEdit = userRole === 'admin' || userRole === 'foreman';

    const [newMaterial, setNewMaterial] = useState({
        material_name: "",
        quantity: "",
        unit_measure: "Ea",
        unit_cost: "",
        status: "To be ordered"
    });

    useEffect(() => {
        let isMounted = true;
        const fetchMaterials = async () => {
            const [materialsResponse, catalogResponse] = await Promise.all([
                supabase.from("project_materials").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
                supabase.from("material_catalog").select("*").order("material_name", { ascending: true })
            ]);

            if (isMounted) {
                setMaterials(materialsResponse.data || []);
                setCatalog(catalogResponse.data || []);
                setLoading(false);
            }
        };
        fetchMaterials();
        return () => { isMounted = false; };
    }, [projectId, supabase]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        let newCost = newMaterial.unit_cost;
        let newUnit = newMaterial.unit_measure;
        const match = catalog.find(c => c.material_name.toLowerCase() === val.toLowerCase());
        if (match) {
            newCost = match.default_unit_cost.toString();
            if (match.default_unit_measure) newUnit = match.default_unit_measure;
        }
        setNewMaterial({ ...newMaterial, material_name: val, unit_cost: newCost, unit_measure: newUnit });
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);

        const { data, error } = await supabase
            .from("project_materials")
            .insert({
                project_id: projectId,
                material_name: newMaterial.material_name,
                quantity: parseFloat(newMaterial.quantity),
                unit_measure: newMaterial.unit_measure,
                unit_cost: parseFloat(newMaterial.unit_cost),
                status: newMaterial.status
            })
            .select()
            .single();

        if (error) {
            alert("Error adding material: " + error.message);
        } else {
            setMaterials([...materials, data]);
            setNewMaterial({ material_name: "", quantity: "", unit_measure: "Ea", unit_cost: "", status: "To be ordered" });
        }
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this material requirement?")) return;

        const { error } = await supabase
            .from("project_materials")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Error deleting material: " + error.message);
        } else {
            setMaterials(materials.filter(m => m.id !== id));
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        // Optimistic update
        setMaterials(materials.map(m => m.id === id ? { ...m, status: newStatus } : m));

        const { error } = await supabase
            .from("project_materials")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) {
            alert("Error updating status: " + error.message);
            // Revert on error (simple reload for now)
            window.location.reload();
        }
    };

    const totalCost = materials.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'To be ordered': return 'bg-gray-100 text-gray-800';
            case 'Ordered': return 'bg-blue-100 text-blue-800';
            case 'To be delivered': return 'bg-yellow-100 text-yellow-800';
            case 'Delivered': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="text-sm text-gray-500 flex items-center"><Loader2 size={16} className="animate-spin mr-2" /> Loading materials...</div>;

    return (
        <div className="space-y-4">
            {/* Materials Table */}
            {materials.length > 0 ? (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty/Unit</th>
                                {canManageCosts && (
                                    <>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Cost</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subtotal</th>
                                    </>
                                )}
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                {canEdit && <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {materials.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.material_name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{Number(item.quantity).toString()} {item.unit_measure || 'Ea'}</td>
                                    {canManageCosts && (
                                        <>
                                            <td className="px-4 py-3 text-sm text-gray-600">${Number(item.unit_cost).toFixed(2)} /{item.unit_measure || 'Ea'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">${(Number(item.quantity) * Number(item.unit_cost)).toFixed(2)}</td>
                                        </>
                                    )}
                                    <td className="px-4 py-3 text-sm">
                                        {canEdit ? (
                                            <select
                                                value={item.status}
                                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                className={`text-xs font-bold px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer ${getStatusStyle(item.status)}`}
                                            >
                                                <option value="To be ordered">To be ordered</option>
                                                <option value="Ordered">Ordered</option>
                                                <option value="To be delivered">To be delivered</option>
                                                <option value="Delivered">Delivered</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusStyle(item.status)}`}>
                                                {item.status}
                                            </span>
                                        )}
                                    </td>
                                    {canEdit && (
                                        <td className="px-4 py-3 text-right text-sm">
                                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        {canManageCosts && materials.length > 0 && (
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Total Estimated Material Cost:</td>
                                    <td className="px-4 py-3 text-sm font-bold text-primary">${totalCost.toFixed(2)}</td>
                                    <td colSpan={canEdit ? 2 : 1}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 border border-gray-100 flex items-center justify-center italic">
                    No material requirements added yet.
                </div>
            )}

            {/* Add New Material Form */}
            {canEdit && (
                <form onSubmit={handleAdd} className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Plus size={16} className="text-primary" /> Add Requirement</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                        <div className="lg:col-span-4">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Material Name <span className="text-red-500">*</span></label>
                            <input type="text" list="material-catalog" required value={newMaterial.material_name} onChange={handleNameChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="e.g. 2x4x8 Lumber" autoComplete="off" />
                            <datalist id="material-catalog">
                                {catalog.map(c => <option key={c.material_name} value={c.material_name} />)}
                            </datalist>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Qty <span className="text-red-500">*</span></label>
                            <input type="number" step="any" required value={newMaterial.quantity} onChange={e => setNewMaterial({ ...newMaterial, quantity: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unit</label>
                            <select value={newMaterial.unit_measure} onChange={e => setNewMaterial({ ...newMaterial, unit_measure: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                                <option value="Ea">Ea</option>
                                <option value="Ln Ft">Ln Ft</option>
                                <option value="Sq Ft">Sq Ft</option>
                                <option value="Cu Yd">Cu Yd</option>
                                <option value="Tons">Tons</option>
                                <option value="Lbs">Lbs</option>
                                <option value="Bags">Bags</option>
                                <option value="Boxes">Boxes</option>
                                <option value="Rolls">Rolls</option>
                                <option value="Sheets">Sheets</option>
                                <option value="Pieces">Pieces</option>
                                <option value="Gal">Gal</option>
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cost ({newMaterial.unit_measure || 'Ea'}) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-sm">$</span>
                                <input type="number" step="0.01" min="0" required value={newMaterial.unit_cost} onChange={e => setNewMaterial({ ...newMaterial, unit_cost: e.target.value })} className="w-full pl-6 pr-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status</label>
                            <select value={newMaterial.status} onChange={e => setNewMaterial({ ...newMaterial, status: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                                <option value="To be ordered">To be ordered</option>
                                <option value="Ordered">Ordered</option>
                                <option value="To be delivered">To be delivered</option>
                                <option value="Delivered">Delivered</option>
                            </select>
                        </div>
                        <div className="lg:col-span-12 mt-2">
                            <button type="submit" disabled={adding} className="w-full sm:w-auto px-6 py-1.5 flex items-center justify-center gap-1 bg-primary text-white rounded-md text-sm font-bold hover:bg-primary/90 disabled:opacity-50 float-right">
                                {adding ? <Loader2 size={16} className="animate-spin" /> : "Add Requirement"}
                            </button>
                            <div className="clear-both"></div>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
