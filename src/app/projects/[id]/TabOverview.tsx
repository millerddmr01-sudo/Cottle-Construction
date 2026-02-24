"use client";

import { useState } from "react";
import { Loader2, Save, FileText, Map, Hammer, ClipboardList } from "lucide-react";
import MaterialManagement from "./MaterialManagement";
import EquipmentManagement from "./EquipmentManagement";
import ChangeOrderManagement from "./ChangeOrderManagement";

export default function TabOverview({ project, userRole, supabase, setProject }: { project: any, userRole: string, supabase: any, setProject: any }) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        material_requirements: project.material_requirements || "",
        measurements: project.measurements || "",
        equipment_list: project.equipment_list || "",
        project_notes: project.project_notes || "",
        estimated_hours: project.estimated_hours || ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { data, error } = await supabase
            .from("projects")
            .update({
                measurements: formData.measurements,
                equipment_list: formData.equipment_list,
                project_notes: formData.project_notes,
                estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
            })
            .eq("id", project.id)
            .select()
            .single();

        if (error) {
            alert("Error saving project details: " + error.message);
        } else {
            setProject((prev: any) => ({ ...prev, ...data }));
        }
        setSaving(false);
    };

    const canEdit = userRole === 'admin' || userRole === 'foreman';

    const hasChanges =
        formData.estimated_hours?.toString() !== (project.estimated_hours?.toString() || "") ||
        formData.measurements !== (project.measurements || "") ||
        formData.project_notes !== (project.project_notes || "");

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Project Scope & Details</h2>
                {canEdit && hasChanges && (
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Changes
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Details */}
                <div className="lg:col-span-7 space-y-8">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Hammer size={16} className="text-gray-400" /> Material Requirements
                        </h3>
                        <MaterialManagement projectId={project.id} userRole={userRole} supabase={supabase} />

                        {/* Legacy Material Requirements text, if any */}
                        {project.material_requirements && (
                            <div className="mt-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Legacy Material Notes</h4>
                                <div className="p-3 bg-gray-50 rounded text-xs text-gray-700 border border-gray-100 whitespace-pre-wrap">
                                    {project.material_requirements}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ClipboardList size={16} className="text-gray-400" /> Equipment List
                        </h3>
                        <EquipmentManagement projectId={project.id} userRole={userRole} supabase={supabase} />

                        {/* Legacy Equipment List text, if any */}
                        {project.equipment_list && (
                            <div className="mt-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Legacy Equipment Notes</h4>
                                <div className="p-3 bg-gray-50 rounded text-xs text-gray-700 border border-gray-100 whitespace-pre-wrap">
                                    {project.equipment_list}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" /> Change Orders
                        </h3>
                        <ChangeOrderManagement projectId={project.id} userRole={userRole} supabase={supabase} />
                    </div>
                </div>

                {/* Right Column - Status, Hours, Notes & Measurements */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Labor Hours</label>
                            {canEdit ? (
                                <input type="number" step="0.5" name="estimated_hours" value={formData.estimated_hours} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="e.g. 120" />
                            ) : (
                                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">{project.estimated_hours || 'N/A'}</div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Map size={16} className="text-gray-400" /> Site Measurements
                        </h3>
                        {canEdit ? (
                            <textarea name="measurements" value={formData.measurements} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="E.g., 200 sq ft deck, 45 linear ft railing..." />
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm text-gray-700 border border-gray-100 min-h-[100px]">
                                {project.measurements || <span className="text-gray-400 italic">No measurements recorded.</span>}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" /> General Notes
                        </h3>
                        {canEdit ? (
                            <textarea name="project_notes" value={formData.project_notes} onChange={handleChange} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="Any special instructions or hazards..." />
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm text-gray-700 border border-gray-100 min-h-[100px]">
                                {project.project_notes || <span className="text-gray-400 italic">No additional notes.</span>}
                            </div>
                        )}
                    </div>

                    {canEdit && hasChanges && (
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-200 flex items-center justify-between shadow-sm">
                            <span className="font-medium">You have unsaved changes.</span>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save All
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
