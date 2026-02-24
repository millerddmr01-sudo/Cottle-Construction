"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Map, Hammer, ClipboardList, FileText, Clock, FileWarning, ExternalLink } from "lucide-react";

export default function TabSummary({ project, userRole, supabase, setProject }: { project: any, userRole: string, supabase: any, setProject: any }) {
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(project.status || "Planning & Estimate");

    const [materials, setMaterials] = useState<any[]>([]);
    const [equipment, setEquipment] = useState<any[]>([]);
    const [changeOrders, setChangeOrders] = useState<any[]>([]);
    const [dailyReports, setDailyReports] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchAllData = async () => {
            setLoadingData(true);
            const [matRes, eqRes, coRes, drRes] = await Promise.all([
                supabase.from("project_materials").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
                supabase.from("project_equipment").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
                supabase.from("project_change_orders").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
                supabase.from("daily_reports").select("*").eq("project_id", project.id).order("date", { ascending: false })
            ]);

            if (isMounted) {
                setMaterials(matRes.data || []);
                setEquipment(eqRes.data || []);
                setChangeOrders(coRes.data || []);
                setDailyReports(drRes.data || []);
                setLoadingData(false);
            }
        };
        fetchAllData();
        return () => { isMounted = false; };
    }, [project.id, supabase]);

    const canEdit = userRole === 'admin' || userRole === 'foreman';
    const hasChanges = status !== (project.status || "Planning & Estimate");

    const handleSave = async () => {
        setSaving(true);
        const { data, error } = await supabase
            .from("projects")
            .update({ status })
            .eq("id", project.id)
            .select()
            .single();

        if (error) {
            alert("Error saving project status: " + error.message);
        } else {
            setProject((prev: any) => ({ ...prev, ...data }));
        }
        setSaving(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Project Summary</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => alert("PDF export coming soon!")} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-bold hover:bg-gray-200 transition-colors">
                        <FileText size={16} /> Export SOW (PDF)
                    </button>
                    {canEdit && hasChanges && (
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Status
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Project Status</label>
                    {canEdit ? (
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white focus:ring-primary focus:border-primary shadow-sm"
                        >
                            <option value="Planning & Estimate">Planning & Estimate</option>
                            <option value="Bid Submitted">Bid Submitted</option>
                            <option value="Approved">Approved</option>
                            <option value="Pre-con">Pre-con</option>
                            <option value="Job Kick-off">Job Kick-off</option>
                            <option value="Post Project">Post Project</option>
                            <option value="Invoice Submitted">Invoice Submitted</option>
                            <option value="Paid">Paid</option>
                        </select>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 font-medium">
                            {project.status || "Planning & Estimate"}
                        </div>
                    )}
                </div>
            </div>

            {loadingData ? (
                <div className="mt-8 p-12 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin inline mr-2" /> Loading project summary data...
                </div>
            ) : (
                <div className="mt-8 space-y-8">
                    {/* Hours & Site Measurements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                                <Clock size={16} className="text-primary" /> Estimated Labor Hours
                            </h3>
                            <div className="p-4 bg-gray-50 rounded-lg text-gray-900 font-medium border border-gray-100 shadow-inner">
                                {project.estimated_hours ? `${project.estimated_hours} Hours` : "Not specified"}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                                <Map size={16} className="text-primary" /> Site Measurements
                            </h3>
                            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap min-h-[60px] border border-gray-100 shadow-inner">
                                {project.measurements || <span className="text-gray-400 italic">No measurements recorded.</span>}
                            </div>
                        </div>
                    </div>

                    {/* General Notes */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                            <FileText size={16} className="text-primary" /> General Notes
                        </h3>
                        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap min-h-[80px] border border-gray-100 shadow-inner">
                            {project.project_notes || <span className="text-gray-400 italic">No general notes recorded.</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Materials */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                                <Hammer size={16} className="text-primary" /> Materials Scope
                            </h3>
                            {materials.length > 0 ? (
                                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden bg-white">
                                    {materials.map(m => (
                                        <li key={m.id} className="p-3 text-sm flex justify-between">
                                            <span className="font-bold text-gray-900">{m.material_name}</span>
                                            <span className="text-gray-600 font-medium">{m.quantity} {m.unit_measure}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 italic border border-gray-100 shadow-inner">No materials specified in scope.</div>
                            )}
                        </div>

                        {/* Equipment */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                                <ClipboardList size={16} className="text-primary" /> Equipment Scope
                            </h3>
                            {equipment.length > 0 ? (
                                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden bg-white">
                                    {equipment.map(e => (
                                        <li key={e.id} className="p-3 text-sm flex justify-between">
                                            <span className="font-bold text-gray-900">{e.equipment_name}</span>
                                            <span className="text-gray-600 font-medium">{e.duration} {e.duration_unit}{Number(e.duration) !== 1 ? 's' : ''}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 italic border border-gray-100 shadow-inner">No equipment specified in scope.</div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Change Orders */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                                <FileWarning size={16} className="text-primary" /> Approved Change Orders
                            </h3>
                            {changeOrders.length > 0 ? (
                                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden bg-white">
                                    {changeOrders.map(co => (
                                        <li key={co.id} className="p-3 text-sm flex flex-col items-start gap-1">
                                            <div className="flex justify-between items-start w-full gap-4">
                                                <span className="font-bold text-gray-900">{co.name}</span>
                                                {co.document_link && (
                                                    <a href={co.document_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 font-bold flex-shrink-0">
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                            </div>
                                            <span className="font-medium text-gray-600 whitespace-pre-wrap">{co.details}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 italic border border-gray-100 shadow-inner">No change orders on this project.</div>
                            )}
                        </div>

                        {/* Daily Reports Summary */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">
                                <ClipboardList size={16} className="text-primary" /> Daily Reports Summary
                            </h3>
                            {dailyReports.length > 0 ? (
                                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden bg-white max-h-60 overflow-y-auto">
                                    {dailyReports.map(dr => (
                                        <li key={dr.id} className="p-3 text-sm">
                                            <div className="font-bold text-gray-900 flex justify-between">
                                                <span>{new Date(dr.date).toLocaleDateString()}</span>
                                                <span className="text-xs font-normal text-gray-500">
                                                    {dr.weather} • {dr.total_hours} hrs
                                                </span>
                                            </div>
                                            <div className="text-gray-600 truncate mt-1">
                                                {dr.work_completed || <span className="italic">No work details provided.</span>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 italic border border-gray-100 shadow-inner">No daily reports submitted yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
