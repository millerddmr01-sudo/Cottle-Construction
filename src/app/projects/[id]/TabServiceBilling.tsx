"use client";

import { useState, useEffect } from "react";
import { Loader2, Receipt, DollarSign, Clock, Wrench, Package, Printer, Plus } from "lucide-react";

export default function TabServiceBilling({ projectId, supabase, userRole }: { projectId: string, supabase: any, userRole: string }) {
    const [loading, setLoading] = useState(true);
    const [hours, setHours] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [equipment, setEquipment] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    const todayStr = new Date().toISOString().split('T')[0];

    // Labor Form State
    const [addingLabor, setAddingLabor] = useState(false);
    const [laborForm, setLaborForm] = useState({
        employee_id: "",
        date: todayStr,
        hours_worked: ""
    });

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            // Fetch Employees for dropdown
            const { data: empData } = await supabase
                .from("user_profiles")
                .select("id, full_name, role, hourly_rate")
                .in("role", ["employee", "foreman"])
                .order("full_name");
            // Fetch Labor (Project Hours) with Employee Hourly Rate
            const { data: hrData } = await supabase
                .from("project_hours")
                .select("*, employee:user_profiles(full_name, hourly_rate)")
                .eq("project_id", projectId)
                .order("date", { ascending: false });

            // Fetch Materials
            const { data: matData } = await supabase
                .from("project_materials")
                .select("*")
                .eq("project_id", projectId);

            // Fetch Equipment
            const { data: eqData } = await supabase
                .from("project_equipment")
                .select("*")
                .eq("project_id", projectId);

            if (isMounted) {
                setHours(hrData || []);
                setMaterials(matData || []);
                setEquipment(eqData || []);
                setEmployees(empData || []);
                setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [projectId, supabase]);

    if (loading) return <div className="py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading service billing data...</div>;

    // Calculations
    const totalLaborCost = hours.reduce((acc, curr) => acc + (Number(curr.hours_worked) * Number(curr.employee?.hourly_rate || 0)), 0);
    const totalMaterialCost = materials.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.unit_cost)), 0);
    const totalEquipmentCost = equipment.reduce((acc, curr) => acc + (Number(curr.duration) * Number(curr.unit_cost)), 0);
    const grandTotal = totalLaborCost + totalMaterialCost + totalEquipmentCost;

    const handleAddLabor = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingLabor(true);

        const { data, error } = await supabase
            .from("project_hours")
            .insert({
                project_id: projectId,
                employee_id: laborForm.employee_id,
                date: laborForm.date,
                hours_worked: parseFloat(laborForm.hours_worked)
            })
            .select("*, employee:user_profiles(full_name, hourly_rate)")
            .single();

        if (error) {
            alert("Error adding manual time entry: " + error.message);
        } else if (data) {
            setHours([data, ...hours]);
            setLaborForm({ employee_id: "", date: todayStr, hours_worked: "" });
        }

        setAddingLabor(false);
    };

    return (
        <div className="space-y-8">
            {/* Header & Print Button */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Receipt className="text-primary" /> Service Billing Summary
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Time and materials auto-calculated for invoicing.</p>
                </div>
                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-md hover:bg-gray-200 flex items-center gap-2 text-sm border border-gray-300">
                    <Printer size={16} /> Print / Export
                </button>
            </div>

            {/* High Level Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                    <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1"><Clock size={14} /> Labor Cost</div>
                    <div className="text-2xl font-extrabold text-gray-900">${totalLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                    <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1"><Package size={14} /> Materials Cost</div>
                    <div className="text-2xl font-extrabold text-gray-900">${totalMaterialCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                    <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1"><Wrench size={14} /> Equipment Cost</div>
                    <div className="text-2xl font-extrabold text-gray-900">${totalEquipmentCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-primary/10 rounded-xl shadow-sm border border-primary/20 p-5 flex flex-col justify-center">
                    <div className="text-primary font-bold uppercase tracking-wider text-xs mb-1">Grand Total</div>
                    <div className="text-3xl font-extrabold text-primary">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            {/* Detailed Line Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-900">Line Items List</h3>
                </div>

                <div className="p-6 space-y-8">
                    {/* Labor Section */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2 flex items-center justify-between">
                            <span>Labor Breakdowns</span>
                            <span className="text-gray-900">${totalLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </h4>

                        {/* Manual entry form for foremen/admins */}
                        {(userRole === 'admin' || userRole === 'foreman') && (
                            <div className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end mb-6 border border-gray-200">
                                <form onSubmit={handleAddLabor} className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Employee</label>
                                        <select
                                            required
                                            value={laborForm.employee_id}
                                            onChange={(e) => setLaborForm({ ...laborForm, employee_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                                        >
                                            <option value="">-- Select Employee --</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.full_name} (${Number(emp.hourly_rate || 0).toFixed(2)}/hr)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={laborForm.date}
                                            onChange={(e) => setLaborForm({ ...laborForm, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hours</label>
                                        <input
                                            type="number"
                                            step="0.25"
                                            min="0"
                                            required
                                            value={laborForm.hours_worked}
                                            onChange={(e) => setLaborForm({ ...laborForm, hours_worked: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                                            placeholder="e.g. 4.5"
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-4 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={addingLabor || !laborForm.employee_id || !laborForm.hours_worked}
                                            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                                        >
                                            {addingLabor ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                            Add Manual Entry
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {hours.length === 0 ? <p className="text-sm text-gray-500 italic">No labor logged.</p> : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-left">
                                        <th className="py-2 font-medium">Employee</th>
                                        <th className="py-2 font-medium">Date</th>
                                        <th className="py-2 font-medium text-right">Hours</th>
                                        <th className="py-2 font-medium text-right">Rate</th>
                                        <th className="py-2 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hours.map(h => (
                                        <tr key={h.id} className="border-t border-gray-50 border-dashed">
                                            <td className="py-2 text-gray-900 font-medium">{h.employee?.full_name || 'Unknown'}</td>
                                            <td className="py-2 text-gray-600">{h.date}</td>
                                            <td className="py-2 text-gray-600 text-right">{h.hours_worked}</td>
                                            <td className="py-2 text-gray-600 text-right">${Number(h.employee?.hourly_rate || 0).toFixed(2)}/hr</td>
                                            <td className="py-2 text-gray-900 font-bold text-right">${(Number(h.hours_worked) * Number(h.employee?.hourly_rate || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Materials Section */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2 flex items-center justify-between">
                            <span>Material Breakdowns</span>
                            <span className="text-gray-900">${totalMaterialCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </h4>
                        {materials.length === 0 ? <p className="text-sm text-gray-500 italic">No materials logged.</p> : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-left">
                                        <th className="py-2 font-medium">Item</th>
                                        <th className="py-2 font-medium text-right">Qty</th>
                                        <th className="py-2 font-medium text-right">Unit Cost</th>
                                        <th className="py-2 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {materials.map(m => (
                                        <tr key={m.id} className="border-t border-gray-50 border-dashed">
                                            <td className="py-2 text-gray-900 font-medium">{m.material_name}</td>
                                            <td className="py-2 text-gray-600 text-right">{m.quantity} {m.unit_measure}</td>
                                            <td className="py-2 text-gray-600 text-right">${Number(m.unit_cost).toFixed(2)} /{m.unit_measure}</td>
                                            <td className="py-2 text-gray-900 font-bold text-right">${(Number(m.quantity) * Number(m.unit_cost)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Equipment Section */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2 flex items-center justify-between">
                            <span>Equipment Breakdowns</span>
                            <span className="text-gray-900">${totalEquipmentCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </h4>
                        {equipment.length === 0 ? <p className="text-sm text-gray-500 italic">No equipment logged.</p> : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-left">
                                        <th className="py-2 font-medium">Equipment</th>
                                        <th className="py-2 font-medium text-right">Duration</th>
                                        <th className="py-2 font-medium text-right">Unit Cost</th>
                                        <th className="py-2 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {equipment.map(e => (
                                        <tr key={e.id} className="border-t border-gray-50 border-dashed">
                                            <td className="py-2 text-gray-900 font-medium">{e.equipment_name}</td>
                                            <td className="py-2 text-gray-600 text-right">{e.duration} {e.duration_unit}</td>
                                            <td className="py-2 text-gray-600 text-right">${Number(e.unit_cost).toFixed(2)} /{e.duration_unit}</td>
                                            <td className="py-2 text-gray-900 font-bold text-right">${(Number(e.duration) * Number(e.unit_cost)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
