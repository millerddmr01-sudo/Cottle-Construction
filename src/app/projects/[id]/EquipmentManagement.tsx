"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function EquipmentManagement({ projectId, userRole, supabase }: { projectId: string, userRole: string, supabase: any }) {
    const [equipment, setEquipment] = useState<any[]>([]);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const canManageCosts = userRole === 'admin' || userRole === 'foreman';
    const canEdit = userRole === 'admin' || userRole === 'foreman';

    const [newEquipment, setNewEquipment] = useState({
        equipment_name: "",
        duration: "",
        duration_unit: "Day",
        unit_cost: "",
        status: "To be ordered"
    });

    useEffect(() => {
        let isMounted = true;
        const fetchEquipment = async () => {
            const [equipmentResponse, catalogResponse] = await Promise.all([
                supabase.from("project_equipment").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
                supabase.from("equipment_catalog").select("*").order("equipment_name", { ascending: true })
            ]);

            if (isMounted) {
                setEquipment(equipmentResponse.data || []);
                setCatalog(catalogResponse.data || []);
                setLoading(false);
            }
        };
        fetchEquipment();
        return () => { isMounted = false; };
    }, [projectId, supabase]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        let newCost = newEquipment.unit_cost;
        let newUnit = newEquipment.duration_unit;
        const match = catalog.find(c => c.equipment_name.toLowerCase() === val.toLowerCase());
        if (match) {
            newCost = match.default_unit_cost.toString();
            newUnit = match.default_duration_unit;
        }
        setNewEquipment({ ...newEquipment, equipment_name: val, unit_cost: newCost, duration_unit: newUnit });
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);

        const { data, error } = await supabase
            .from("project_equipment")
            .insert({
                project_id: projectId,
                equipment_name: newEquipment.equipment_name,
                duration: parseFloat(newEquipment.duration),
                duration_unit: newEquipment.duration_unit,
                unit_cost: parseFloat(newEquipment.unit_cost),
                status: newEquipment.status
            })
            .select()
            .single();

        if (error) {
            alert("Error adding equipment: " + error.message);
        } else {
            setEquipment([...equipment, data]);
            setNewEquipment({ equipment_name: "", duration: "", duration_unit: "Day", unit_cost: "", status: "To be ordered" });
        }
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this equipment requirement?")) return;

        const { error } = await supabase
            .from("project_equipment")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Error deleting equipment: " + error.message);
        } else {
            setEquipment(equipment.filter(e => e.id !== id));
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setEquipment(equipment.map(e => e.id === id ? { ...e, status: newStatus } : e));
        const { error } = await supabase.from("project_equipment").update({ status: newStatus }).eq("id", id);
        if (error) alert("Status update failed: " + error.message);
    };

    const totalCost = equipment.reduce((sum, item) => sum + (Number(item.duration) * Number(item.unit_cost)), 0);

    if (loading) return <div className="text-sm text-gray-500 flex items-center"><Loader2 size={16} className="animate-spin mr-2" /> Loading equipment...</div>;

    return (
        <div className="space-y-4">
            {/* Equipment Table */}
            {equipment.length > 0 ? (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Equipment</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time on Site</th>
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
                            {equipment.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.equipment_name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {Number(item.duration).toString()} {item.duration_unit}{Number(item.duration) !== 1 ? 's' : ''}
                                    </td>
                                    {canManageCosts && (
                                        <>
                                            <td className="px-4 py-3 text-sm text-gray-600">${Number(item.unit_cost).toFixed(2)} /{item.duration_unit}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">${(Number(item.duration) * Number(item.unit_cost)).toFixed(2)}</td>
                                        </>
                                    )}
                                    <td className="px-4 py-3 text-sm">
                                        <select
                                            value={item.status || "To be ordered"}
                                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                            disabled={!canEdit}
                                            className={`text-xs font-bold rounded px-2 py-1 border border-gray-300 ${!canEdit ? 'bg-transparent border-none appearance-none font-medium' : ''} ${item.status === 'Delivered' ? 'text-green-700 bg-green-50' : item.status === 'Ordered' ? 'text-blue-700 bg-blue-50' : 'text-orange-700 bg-orange-50'}`}
                                        >
                                            <option value="To be ordered">To be ordered</option>
                                            <option value="Ordered">Ordered</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Returned">Returned</option>
                                        </select>
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
                        {canManageCosts && equipment.length > 0 && (
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                <tr>
                                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Total Estimated Equipment Cost:</td>
                                    <td className="px-4 py-3 text-sm font-bold text-primary">${totalCost.toFixed(2)}</td>
                                    <td colSpan={canEdit ? 2 : 1}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 border border-gray-100 flex items-center justify-center italic">
                    No equipment listed yet.
                </div>
            )}

            {/* Add New Equipment Form */}
            {canEdit && (
                <form onSubmit={handleAdd} className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Plus size={16} className="text-primary" /> Add Equipment</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                        <div className="lg:col-span-5">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Equipment Name <span className="text-red-500">*</span></label>
                            <input type="text" list="equipment-catalog" required value={newEquipment.equipment_name} onChange={handleNameChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="e.g. Mini Excavator" autoComplete="off" />
                            <datalist id="equipment-catalog">
                                {catalog.map(c => <option key={c.equipment_name} value={c.equipment_name} />)}
                            </datalist>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Duration <span className="text-red-500">*</span></label>
                            <input type="number" step="any" required value={newEquipment.duration} onChange={e => setNewEquipment({ ...newEquipment, duration: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unit</label>
                            <select value={newEquipment.duration_unit} onChange={e => setNewEquipment({ ...newEquipment, duration_unit: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                                <option value="Day">Day</option>
                                <option value="Week">Week</option>
                                <option value="Month">Month</option>
                            </select>
                        </div>
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cost ({newEquipment.duration_unit}) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-sm">$</span>
                                <input type="number" step="0.01" min="0" required value={newEquipment.unit_cost} onChange={e => setNewEquipment({ ...newEquipment, unit_cost: e.target.value })} className="w-full pl-6 pr-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                            </div>
                        </div>
                        <div className="lg:col-span-12 mt-2">
                            <button type="submit" disabled={adding} className="w-full sm:w-auto px-6 py-1.5 flex items-center justify-center gap-1 bg-primary text-white rounded-md text-sm font-bold hover:bg-primary/90 disabled:opacity-50 float-right">
                                {adding ? <Loader2 size={16} className="animate-spin" /> : "Add Equipment"}
                            </button>
                            <div className="clear-both"></div>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
