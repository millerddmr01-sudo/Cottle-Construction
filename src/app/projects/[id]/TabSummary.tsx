"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Save, Map, Hammer, ClipboardList, FileText, Clock, FileWarning, ExternalLink, X } from "lucide-react";
import { generateAndUploadSOW } from "@/lib/exportSOW";

export default function TabSummary({ project, userRole, supabase, setProject }: { project: any, userRole: string, supabase: any, setProject: any }) {
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(project.status || "Planning & Estimate");
    const [customerId, setCustomerId] = useState(project.customer_id || "");

    const [materials, setMaterials] = useState<any[]>([]);
    const [equipment, setEquipment] = useState<any[]>([]);
    const [changeOrders, setChangeOrders] = useState<any[]>([]);
    const [dailyReports, setDailyReports] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [photos, setPhotos] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // SOW Export State
    const [isSowDialogOpen, setIsSowDialogOpen] = useState(false);
    const [generatingSow, setGeneratingSow] = useState(false);
    const [selectedSowSections, setSelectedSowSections] = useState<string[]>([
        'general_notes', 'materials', 'equipment', 'change_orders', 'daily_reports'
    ]);
    const [selectedSowPhotos, setSelectedSowPhotos] = useState<string[]>([]);
    
    // Removed native dialog effect to conditionally render instead

    useEffect(() => {
        let isMounted = true;
        const fetchAllData = async () => {
            setLoadingData(true);
            const [matRes, eqRes, coRes, drRes, custRes, photosRes, docsRes] = await Promise.all([
                supabase.from("project_materials").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
                supabase.from("project_equipment").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
                supabase.from("project_change_orders").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
                supabase.from("daily_reports").select("*").eq("project_id", project.id).order("date", { ascending: false }),
                supabase.from("user_profiles").select("id, full_name, company_name").eq("role", "customer").order("full_name", { ascending: true }),
                supabase.from("project_photos").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
                supabase.from("project_documents").select("*").eq("project_id", project.id).order("created_at", { ascending: false })
            ]);

            if (isMounted) {
                setMaterials(matRes.data || []);
                setEquipment(eqRes.data || []);
                setChangeOrders(coRes.data || []);
                setDailyReports(drRes.data || []);
                setCustomers(custRes.data || []);
                setPhotos(photosRes.data || []);
                setDocuments(docsRes.data || []);
                setSelectedSowPhotos(photosRes.data?.map((p: any) => p.id) || []);
                setLoadingData(false);
            }
        };
        fetchAllData();
        return () => { isMounted = false; };
    }, [project.id, supabase]);

    const canEdit = userRole === 'admin' || userRole === 'foreman';
    const hasChanges = status !== (project.status || "Planning & Estimate") || customerId !== (project.customer_id || "");

    const handleSave = async () => {
        setSaving(true);
        const { data, error } = await supabase
            .from("projects")
            .update({ 
                status,
                customer_id: customerId || null
            })
            .eq("id", project.id)
            .select("*, customer:user_profiles(full_name, company_name, email, phone_number)")
            .single();

        if (error) {
            alert("Error saving project details: " + error.message);
        } else {
            setProject((prev: any) => ({ ...prev, ...data }));
        }
        setSaving(false);
    };

    const handleSowExport = async () => {
        setGeneratingSow(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await generateAndUploadSOW(
                project,
                { materials, equipment, changeOrders, dailyReports, photos: photos.filter(p => selectedSowPhotos.includes(p.id)), documents },
                selectedSowSections,
                supabase,
                user?.id || project.customer_id
            );
            setIsSowDialogOpen(false);
            alert("SOW generated and saved to Project Documents successfully!");
        } catch (e: any) {
            alert("Failed to generate SOW: " + e.message);
        } finally {
            setGeneratingSow(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Project Summary</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSowDialogOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-bold hover:bg-gray-200 transition-colors">
                        <FileText size={16} /> Create SOW
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
                            {project.project_type === 'service' ? (
                                <>
                                    <option value="Planning & Estimate">Planning & Estimate</option>
                                    <option value="In progress">In progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Ready for Billing">Ready for Billing</option>
                                    <option value="Invoice Submitted">Invoice Submitted</option>
                                    <option value="Paid">Paid</option>
                                </>
                            ) : (
                                <>
                                    <option value="Planning & Estimate">Planning & Estimate</option>
                                    <option value="Bid Submitted">Bid Submitted</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Pre-con">Pre-con</option>
                                    <option value="Job Kick-off">Job Kick-off</option>
                                    <option value="Post Project">Post Project</option>
                                    <option value="Invoice Submitted">Invoice Submitted</option>
                                    <option value="Paid">Paid</option>
                                </>
                            )}
                        </select>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 font-medium">
                            {project.status || "Planning & Estimate"}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Customer</label>
                    {canEdit ? (
                        <select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white focus:ring-primary focus:border-primary shadow-sm"
                        >
                            <option value="">-- No Customer Assigned --</option>
                            {customers.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.full_name || c.company_name || c.id}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 font-medium">
                            {project.customer ? (project.customer.company_name || project.customer.full_name) : "No Customer Assigned"}
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

            {/* SOW Export Dialog */}
            {isSowDialogOpen && (
                <dialog 
                    ref={(el) => {
                        if (el && !el.open) {
                            el.showModal();
                        }
                    }}
                className="bg-transparent p-0 m-auto rounded-xl backdrop:bg-black/50 open:flex flex-col w-full max-w-md max-h-[90vh]"
                onClose={() => setIsSowDialogOpen(false)}
            >
                <div className="bg-white rounded-xl shadow-xl w-full h-full flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Export Statement of Work</h3>
                            <button onClick={() => setIsSowDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-600 mb-4">Select the sections to include in the SOW PDF. The document will be automatically saved to the project's documents.</p>
                            
                            <div className="space-y-3">
                                {[
                                    { id: 'general_notes', label: 'Additional Project Details & General Notes' },
                                    { id: 'materials', label: 'Material Requirements' },
                                    { id: 'equipment', label: 'Equipment List' },
                                    { id: 'change_orders', label: 'Change Orders' },
                                    { id: 'daily_reports', label: 'Daily Reports' }
                                ].map(section => (
                                    <div key={section.id} className="flex flex-col gap-2">
                                        <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                                checked={selectedSowSections.includes(section.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedSowSections([...selectedSowSections, section.id]);
                                                    } else {
                                                        setSelectedSowSections(selectedSowSections.filter(id => id !== section.id));
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-medium text-gray-900">{section.label}</span>
                                        </label>
                                        
                                        {section.id === 'photos' && selectedSowSections.includes('photos') && photos.length > 0 && (
                                            <div className="ml-8 p-3 border border-gray-100 rounded-lg bg-gray-50 flex flex-col gap-2 max-h-48 overflow-y-auto">
                                                <p className="text-xs font-bold text-gray-500 uppercase">Select Photos to Include:</p>
                                                {photos.map(photo => (
                                                    <label key={photo.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox"
                                                            className="w-3 h-3 text-primary rounded border-gray-300"
                                                            checked={selectedSowPhotos.includes(photo.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedSowPhotos([...selectedSowPhotos, photo.id]);
                                                                } else {
                                                                    setSelectedSowPhotos(selectedSowPhotos.filter(id => id !== photo.id));
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-xs text-gray-700 truncate" title={photo.description || photo.photo_type}>
                                                            {photo.photo_type.replace('_', ' ')} {photo.description ? `- ${photo.description}` : ''}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button onClick={() => setIsSowDialogOpen(false)} disabled={generatingSow} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">Cancel</button>
                            <button 
                                onClick={handleSowExport} 
                                disabled={generatingSow || selectedSowSections.length === 0} 
                                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {generatingSow ? <><Loader2 className="animate-spin" size={16} /> Generating...</> : "Create PDF"}
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    );
}
