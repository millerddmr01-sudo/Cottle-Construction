"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, GripVertical, AlertTriangle, CheckCircle, Camera, CheckSquare2, FileWarning, Briefcase, Rocket, FileCheck, Edit, Trash2, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function TabChecklist({ projectId, userRole, userId, supabase }: { projectId: string, userRole: string, userId: string, supabase: any }) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [equipment, setEquipment] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activePhase, setActivePhase] = useState<"pre_con" | "kickoff" | "post_project">("pre_con");

    // Section Creation
    const [isCreatingSection, setIsCreatingSection] = useState(false);
    const [newSection, setNewSection] = useState({
        title: "",
        sort_order: 1,
        allowed_roles: ["admin", "foreman", "employee"]
    });

    // Task Creation
    const [activeSectionIdForTask, setActiveSectionIdForTask] = useState<string | null>(null);
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        sort_order: 1,
        status: "pending",
        assigned_to: "",
        requires_picture: false,
        is_inspection: false,
        dependent_on_task_ids: [] as string[]
    });

    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTaskData, setEditTaskData] = useState<any>(null);

    const isManager = userRole === 'admin' || userRole === 'foreman';

    useEffect(() => {
        let isMounted = true;
        const fetchChecklistData = async () => {
            const [tasksRes, sectionsRes, materialsRes, equipmentRes] = await Promise.all([
                supabase
                    .from("project_tasks")
                    .select("*, assignee:user_profiles(full_name)")
                    .eq("project_id", projectId)
                    .order("sort_order", { ascending: true }),
                supabase
                    .from("project_checklist_sections")
                    .select("*")
                    .eq("project_id", projectId)
                    .order("sort_order", { ascending: true }),
                supabase.from("project_materials").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
                supabase.from("project_equipment").select("*").eq("project_id", projectId).order("created_at", { ascending: true })
            ]);

            if (isMounted) {
                setTasks(tasksRes.data || []);
                setSections(sectionsRes.data || []);
                setMaterials(materialsRes.data || []);
                setEquipment(equipmentRes.data || []);
            }

            if (isManager) {
                const { data: empData } = await supabase
                    .from("user_profiles")
                    .select("id, full_name, role")
                    .in("role", ["employee", "foreman"])
                    .order("full_name", { ascending: true });
                if (isMounted) setEmployees(empData || []);
            }
            if (isMounted) setLoading(false);
        };
        fetchChecklistData();
        return () => { isMounted = false; };
    }, [projectId, supabase, isManager]);

    const handleCreateSection = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { data, error } = await supabase.from("project_checklist_sections").insert({
            project_id: projectId,
            phase: activePhase,
            title: newSection.title,
            sort_order: newSection.sort_order,
            allowed_roles: newSection.allowed_roles
        }).select().single();

        if (error) {
            alert("Error creating section: " + error.message);
        } else {
            setSections([...sections, data].sort((a, b) => a.sort_order - b.sort_order));
            setNewSection({ title: "", sort_order: sections.filter(s => s.phase === activePhase).length + 2, allowed_roles: ["admin", "foreman", "employee"] });
            setIsCreatingSection(false);
        }
        setSaving(false);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSectionIdForTask) return;
        setSaving(true);
        const { data, error } = await supabase.from("project_tasks").insert({
            project_id: projectId,
            section_id: activeSectionIdForTask,
            title: newTask.title,
            description: newTask.description,
            sort_order: newTask.sort_order,
            status: newTask.status,
            assigned_to: newTask.assigned_to || null,
            requires_picture: newTask.requires_picture,
            is_inspection: newTask.is_inspection,
            dependent_on_task_ids: newTask.dependent_on_task_ids
        }).select("*, assignee:user_profiles(full_name)").single();

        if (error) {
            alert("Error creating task: " + error.message);
        } else {
            setTasks([...tasks, data].sort((a, b) => a.sort_order - b.sort_order));

            // Increment sort order for next potential task in this section
            const tasksInSection = tasks.filter(t => t.section_id === activeSectionIdForTask);
            setNewTask({ title: "", description: "", sort_order: tasksInSection.length + 2, status: "pending", assigned_to: "", requires_picture: false, is_inspection: false, dependent_on_task_ids: [] });
            setActiveSectionIdForTask(null);
        }
        setSaving(false);
    };

    const updateTaskStatus = async (taskId: string, newStatus: string) => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        const taskToUpdate = tasks[taskIndex];

        // --- ENFORCE DEPENDENCY LOGIC ---
        // If we are trying to mark it as anything but pending, check dependencies first
        if (newStatus !== 'pending') {
            // Rule: Check if ANY task with a lower sort_order is marked as 'inspection' AND is not 'completed'
            const blockingInspection = tasks.find(t =>
                t.section_id === taskToUpdate.section_id &&
                t.sort_order < taskToUpdate.sort_order &&
                (t.is_inspection === true || t.status === 'inspection') &&
                t.status !== 'completed'
            );

            if (blockingInspection) {
                alert(`Cannot update task. You are blocked by a pending inspection: "${blockingInspection.title}"`);
                return;
            }
        }

        const { error } = await supabase.from("project_tasks").update({ status: newStatus }).eq("id", taskId);
        if (error) {
            alert("Failed to update status: " + error.message);
        } else {
            const updatedTasks = [...tasks];
            updatedTasks[taskIndex].status = newStatus;
            setTasks(updatedTasks);
        }
    };

    const updateMaterialStatus = async (id: string, newStatus: string) => {
        setMaterials(materials.map(m => m.id === id ? { ...m, status: newStatus } : m));
        await supabase.from("project_materials").update({ status: newStatus }).eq("id", id);
    };

    const updateEquipmentStatus = async (id: string, newStatus: string) => {
        setEquipment(equipment.map(e => e.id === id ? { ...e, status: newStatus } : e));
        await supabase.from("project_equipment").update({ status: newStatus }).eq("id", id);
    };

    const updateTaskAssignee = async (taskId: string, newAssigneeId: string) => {
        const { data, error } = await supabase
            .from("project_tasks")
            .update({ assigned_to: newAssigneeId || null })
            .eq("id", taskId)
            .select("*, assignee:user_profiles(full_name)")
            .single();

        if (error) {
            alert("Failed to assign task: " + error.message);
        } else {
            setTasks(tasks.map(t => t.id === taskId ? data : t));
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Are you sure you want to delete this checklist item?")) return;
        const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
        if (error) {
            alert("Failed to delete task: " + error.message);
        } else {
            setTasks(tasks.filter(t => t.id !== taskId));
        }
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTaskId) return;
        setSaving(true);
        const { data, error } = await supabase.from("project_tasks").update({
            title: editTaskData.title,
            description: editTaskData.description,
            sort_order: editTaskData.sort_order,
            assigned_to: editTaskData.assigned_to || null,
            requires_picture: editTaskData.requires_picture,
            is_inspection: editTaskData.is_inspection,
            status: editTaskData.status
        }).eq("id", editingTaskId).select("*, assignee:user_profiles(full_name)").single();

        if (error) {
            alert("Failed to update task: " + error.message);
        } else {
            setTasks(tasks.map(t => t.id === editingTaskId ? data : t).sort((a, b) => a.sort_order - b.sort_order));
            setEditingTaskId(null);
            setEditTaskData(null);
        }
        setSaving(false);
    };

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination || !isManager) return;

        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;

        if (sourceIndex === destinationIndex) return;

        // Ensure we are dropping within the same section (for now, we'll only support reordering within the section)
        const sectionId = result.source.droppableId;
        if (result.destination.droppableId !== sectionId) return;

        // Get sorted tasks for THIS specific section
        const sectionTasks = tasks.filter(t => t.section_id === sectionId).sort((a, b) => a.sort_order - b.sort_order);

        // Remove from old index, insert at new index
        const reorderedSectionTasks = Array.from(sectionTasks);
        const [movedTask] = reorderedSectionTasks.splice(sourceIndex, 1);
        reorderedSectionTasks.splice(destinationIndex, 0, movedTask);

        // Update the sort_order of all affected tasks locally
        const updatedLocalTasks = [...tasks];
        const updatesForDb = reorderedSectionTasks.map((t, index) => {
            const newOrder = index + 1;
            // Update local array reference
            const localTaskIndex = updatedLocalTasks.findIndex(lt => lt.id === t.id);
            if (localTaskIndex !== -1) updatedLocalTasks[localTaskIndex].sort_order = newOrder;

            return {
                id: t.id,
                project_id: projectId,
                section_id: t.section_id,
                title: t.title,
                status: t.status,
                sort_order: newOrder,
                requires_picture: t.requires_picture // Add other required fields if needed, but these are the main ones
            };
        });

        // Optimistically update UI
        setTasks(updatedLocalTasks);

        // Bulk update database (Upsert on ID)
        const { error } = await supabase.from('project_tasks').upsert(updatesForDb, { onConflict: 'id' });

        if (error) {
            alert("Failed to save new order: " + error.message);
            // Re-fetch to fix UI if it failed
            const { data } = await supabase.from("project_tasks").select("*, assignee:user_profiles(full_name)").eq("project_id", projectId).order("sort_order", { ascending: true });
            if (data) setTasks(data);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'completed': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200"><CheckCircle size={12} className="mr-1 inline" /> Completed</span>;
            case 'in_progress': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">In Progress</span>;
            case 'hold_point': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200"><AlertTriangle size={12} className="mr-1 inline" /> Hold Point</span>;
            case 'inspection': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200"><FileWarning size={12} className="mr-1 inline" /> Inspection Req.</span>;
            default: return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">Pending</span>;
        }
    };

    if (loading) return <div className="py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading Checklist...</div>;

    const visibleSections = sections.filter(s => s.phase === activePhase);

    return (
        <div className="space-y-6">

            {/* Phase Sub Navigation */}
            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                <button
                    onClick={() => setActivePhase('pre_con')}
                    className={`flex-1 py-2 font-bold text-sm rounded-md flex justify-center items-center gap-2 transition-colors ${activePhase === 'pre_con' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                    <Briefcase size={16} /> Pre-Con
                </button>
                <button
                    onClick={() => setActivePhase('kickoff')}
                    className={`flex-1 py-2 font-bold text-sm rounded-md flex justify-center items-center gap-2 transition-colors ${activePhase === 'kickoff' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                    <Rocket size={16} /> Job Kickoff
                </button>
                <button
                    onClick={() => setActivePhase('post_project')}
                    className={`flex-1 py-2 font-bold text-sm rounded-md flex justify-center items-center gap-2 transition-colors ${activePhase === 'post_project' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                    <FileCheck size={16} /> Post Project
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {activePhase === 'pre_con' && "Pre-Construction Checklist"}
                        {activePhase === 'kickoff' && "Job Kickoff Checklist"}
                        {activePhase === 'post_project' && "Post Project Checklist"}
                    </h2>
                    {isManager && (
                        <button onClick={() => {
                            setIsCreatingSection(!isCreatingSection);
                            setNewSection(prev => ({ ...prev, sort_order: visibleSections.length + 1 }));
                        }} className="text-sm font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md">
                            <Plus size={16} /> {isCreatingSection ? "Cancel Section" : "Add Section"}
                        </button>
                    )}
                </div>

                {isCreatingSection && isManager && (
                    <form onSubmit={handleCreateSection} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 relative">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Order # <span className="text-red-500">*</span></label>
                            <input type="number" required value={newSection.sort_order} onChange={e => setNewSection({ ...newSection, sort_order: parseInt(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                        </div>
                        <div className="md:col-span-5">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Section Title <span className="text-red-500">*</span></label>
                            <input type="text" required value={newSection.title} onChange={e => setNewSection({ ...newSection, title: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="E.g. Permitting & Approvals" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Visibility Rules</label>
                            <select
                                value={newSection.allowed_roles.length === 3 ? "all" : "managers"}
                                onChange={e => setNewSection({ ...newSection, allowed_roles: e.target.value === 'all' ? ["admin", "foreman", "employee"] : ["admin", "foreman"] })}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary"
                            >
                                <option value="all">Visible to Everyone</option>
                                <option value="managers">Admin & Foreman Only</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 h-full flex items-end">
                            <button type="submit" disabled={saving} className="w-full py-1.5 bg-primary text-white font-bold rounded hover:bg-primary/90 disabled:opacity-50 text-sm flex justify-center items-center h-[34px]">
                                {saving ? <Loader2 className="animate-spin" size={16} /> : "Save Section"}
                            </button>
                        </div>
                    </form>
                )}

                {visibleSections.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                        {isManager ? "No sections created for this checklist yet. Click 'Add Section' to get started." : "No sections available in this phase."}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {visibleSections.map(section => {
                            const sectionTasks = tasks.filter(t => t.section_id === section.id).sort((a, b) => a.sort_order - b.sort_order);
                            const isCreatingThisTask = activeSectionIdForTask === section.id;

                            return (
                                <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            {isManager && <GripVertical size={16} className="text-gray-400 cursor-grab hover:text-primary transition-colors" />}
                                            <h3 className="font-bold text-gray-900 text-base">{section.title}</h3>
                                            <span className="text-xs font-bold bg-white text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">{sectionTasks.length} items</span>
                                        </div>
                                    </div>

                                    <div className="bg-white">
                                        {/* Auto-injected Materials & Equipment from Scope */}
                                        {section.title === 'Materials & Equipment' && (materials.length > 0 || equipment.length > 0) && (
                                            <div className="border-b-4 border-gray-100 bg-blue-50/30">
                                                <div className="px-4 py-2 bg-blue-100 border-b border-blue-200 text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center justify-between">
                                                    <span>Scope Requirements (Auto-Synced)</span>
                                                </div>
                                                <div className="divide-y divide-gray-200">
                                                    {materials.map((mat) => (
                                                        <div key={`mat-${mat.id}`} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                                    📦 {mat.material_name}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 mt-0.5">{mat.quantity} {mat.unit_measure}</p>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <select
                                                                    value={mat.status || "To be ordered"}
                                                                    onChange={(e) => updateMaterialStatus(mat.id, e.target.value)}
                                                                    className={`text-xs font-bold rounded-md py-1.5 pl-3 pr-8 border-gray-300 focus:ring-primary focus:border-primary
                                                                        ${mat.status === 'Delivered' ? 'bg-green-50 text-green-700' :
                                                                            mat.status === 'Ordered' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
                                                                    `}
                                                                >
                                                                    <option value="To be ordered">To be ordered</option>
                                                                    <option value="Ordered">Ordered</option>
                                                                    <option value="Delivered">Delivered</option>
                                                                    <option value="Returned">Returned</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {equipment.map((eq) => (
                                                        <div key={`eq-${eq.id}`} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                                    🚜 {eq.equipment_name}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 mt-0.5">{eq.duration} {eq.duration_unit}{Number(eq.duration) !== 1 ? 's' : ''}</p>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <select
                                                                    value={eq.status || "To be ordered"}
                                                                    onChange={(e) => updateEquipmentStatus(eq.id, e.target.value)}
                                                                    className={`text-xs font-bold rounded-md py-1.5 pl-3 pr-8 border-gray-300 focus:ring-primary focus:border-primary
                                                                        ${eq.status === 'Delivered' ? 'bg-green-50 text-green-700' :
                                                                            eq.status === 'Ordered' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
                                                                    `}
                                                                >
                                                                    <option value="To be ordered">To be ordered</option>
                                                                    <option value="Ordered">Ordered</option>
                                                                    <option value="Delivered">Delivered</option>
                                                                    <option value="Returned">Returned</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Render Tasks for this Section */}
                                        {sectionTasks.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50/50 italic">
                                                No tasks added to this section.
                                            </div>
                                        ) : (
                                            <DragDropContext onDragEnd={handleDragEnd}>
                                                <Droppable droppableId={section.id}>
                                                    {(provided) => (
                                                        <div
                                                            {...provided.droppableProps}
                                                            ref={provided.innerRef}
                                                            className="divide-y divide-gray-100"
                                                        >
                                                            {sectionTasks.map((task, index) => {
                                                                const isBlocked = sectionTasks.some(t => t.sort_order < task.sort_order && (t.is_inspection || t.status === 'inspection') && t.status !== 'completed');

                                                                return (
                                                                    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!isManager || editingTaskId === task.id}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                className={`p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-gray-50 transition-colors 
                                                                                    ${task.status === 'completed' ? 'opacity-60 bg-gray-50' : ''} 
                                                                                    ${isBlocked && task.status !== 'completed' ? 'opacity-70 grayscale-[30%]' : ''}
                                                                                    ${snapshot.isDragging ? 'bg-blue-50/80 shadow-lg ring-1 ring-primary' : ''}
                                                                                `}
                                                                            >
                                                                                {editingTaskId === task.id ? (
                                                                                    <form onSubmit={handleUpdateTask} className="w-full bg-white p-3 rounded border border-blue-200 shadow-sm relative grid grid-cols-1 md:grid-cols-12 gap-3">
                                                                                        <div className="md:col-span-1">
                                                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ord #</label>
                                                                                            <input type="number" required value={editTaskData?.sort_order || 0} onChange={e => setEditTaskData({ ...editTaskData, sort_order: parseInt(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary" />
                                                                                        </div>
                                                                                        <div className="md:col-span-4">
                                                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Task Title <span className="text-red-500">*</span></label>
                                                                                            <input type="text" required value={editTaskData?.title || ""} onChange={e => setEditTaskData({ ...editTaskData, title: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary" />
                                                                                        </div>
                                                                                        <div className="md:col-span-2">
                                                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                                                                                            <select value={editTaskData?.status || "pending"} onChange={e => setEditTaskData({ ...editTaskData, status: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary">
                                                                                                <option value="pending">Pending</option>
                                                                                                <option value="in_progress">In Progress</option>
                                                                                                <option value="completed">Completed</option>
                                                                                                <option value="hold_point">Hold Point</option>
                                                                                            </select>
                                                                                        </div>
                                                                                        <div className="md:col-span-3">
                                                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assignee</label>
                                                                                            <select value={editTaskData?.assigned_to || ""} onChange={e => setEditTaskData({ ...editTaskData, assigned_to: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary">
                                                                                                <option value="">-- Optional --</option>
                                                                                                {employees.map(emp => (
                                                                                                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                                                                                ))}
                                                                                            </select>
                                                                                        </div>
                                                                                        <div className="md:col-span-2 flex items-end gap-2">
                                                                                            <button type="submit" disabled={saving} className="flex-1 py-1.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50 text-xs h-[30px] flex justify-center items-center">
                                                                                                {saving ? <Loader2 className="animate-spin" size={14} /> : "Update"}
                                                                                            </button>
                                                                                            <button type="button" onClick={() => setEditingTaskId(null)} disabled={saving} className="py-1.5 px-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 disabled:opacity-50 text-xs h-[30px] flex justify-center items-center">
                                                                                                <X size={14} />
                                                                                            </button>
                                                                                        </div>
                                                                                        <div className="md:col-span-12 flex flex-col gap-2 mt-1">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <input type="checkbox" id="req_pic_edit" checked={editTaskData?.requires_picture || false} onChange={e => setEditTaskData({ ...editTaskData, requires_picture: e.target.checked })} className="h-3.5 w-3.5 text-primary rounded ring-primary" />
                                                                                                <label htmlFor="req_pic_edit" className="text-[11px] font-medium text-gray-600">Require photo upload for proof</label>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <input type="checkbox" id="is_inspection_edit" checked={editTaskData?.is_inspection || false} onChange={e => setEditTaskData({ ...editTaskData, is_inspection: e.target.checked })} className="h-3.5 w-3.5 text-purple-600 rounded ring-purple-600" />
                                                                                                <label htmlFor="is_inspection_edit" className="text-[11px] font-bold text-purple-700">This is an Inspection (Blocks subsequent tasks until completed)</label>
                                                                                            </div>
                                                                                        </div>
                                                                                    </form>
                                                                                ) : (
                                                                                    <>
                                                                                        {/* Sort Order & Grab */}
                                                                                        <div className="hidden md:flex flex-col items-center justify-center text-gray-400 w-6">
                                                                                            <div className="text-xs font-bold leading-none mb-1">{task.sort_order}</div>
                                                                                            {isManager && (
                                                                                                <div {...provided.dragHandleProps} className="cursor-grab hover:text-primary transition-colors focus:outline-none">
                                                                                                    <GripVertical size={14} />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* Details */}
                                                                                        <div className="flex-1">
                                                                                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                                                                                <h4 className={`font-bold text-sm text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{task.title}</h4>
                                                                                                <StatusBadge status={task.status} />
                                                                                                {task.is_inspection && <span title="This acts as a blocker until completed" className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">🔍 INSPECTION</span>}
                                                                                                {task.requires_picture && <span title="Photo proof required" className="text-blue-500 bg-blue-50 p-1 rounded"><Camera size={14} /></span>}
                                                                                                {isBlocked && task.status !== 'completed' && <span title="Blocked by an earlier incomplete Inspection" className="text-xs font-bold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded"><AlertTriangle size={12} /> BLOCKED</span>}
                                                                                            </div>

                                                                                            {(task.assignee || task.description) && (
                                                                                                <div className="flex flex-col gap-1 text-xs text-gray-500 mt-1">
                                                                                                    {task.description && <p>{task.description}</p>}
                                                                                                    {task.assignee && <p className="font-medium text-gray-700">👤 {task.assignee.full_name}</p>}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* Actions */}
                                                                                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                                                            {isManager && (
                                                                                                <div className="flex items-center gap-1 mr-2 bg-gray-100 rounded border border-gray-200 p-0.5">
                                                                                                    <button onClick={() => { setEditingTaskId(task.id); setEditTaskData(task); }} title="Edit Task" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded transition-colors">
                                                                                                        <Edit size={14} />
                                                                                                    </button>
                                                                                                    <button onClick={() => handleDeleteTask(task.id)} title="Delete Task" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors">
                                                                                                        <Trash2 size={14} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                            {isManager && (
                                                                                                <select
                                                                                                    value={task.assigned_to || ""}
                                                                                                    onChange={(e) => updateTaskAssignee(task.id, e.target.value)}
                                                                                                    className="text-xs font-bold rounded-md py-1.5 pl-3 pr-8 focus:ring-primary focus:border-primary border-gray-300 bg-gray-50 text-gray-700 w-32 truncate"
                                                                                                >
                                                                                                    <option value="">Unassigned</option>
                                                                                                    {employees.map(emp => (
                                                                                                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                                                                                    ))}
                                                                                                </select>
                                                                                            )}
                                                                                            <select
                                                                                                value={task.status}
                                                                                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                                                                                disabled={isBlocked && task.status !== 'completed' && task.status !== 'inspection'}
                                                                                                className={`text-xs font-bold rounded-md py-1.5 pl-3 pr-8 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed border-gray-300
                                                                            ${task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                                                        task.status === 'inspection' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                                                        `}
                                                                                            >
                                                                                                <option value="pending">Pending</option>
                                                                                                <option value="in_progress">In Progress</option>
                                                                                                <option value="completed">Completed</option>
                                                                                                {(isManager || task.status === 'hold_point') && <option value="hold_point">Hold Point</option>}
                                                                                            </select>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>
                                        )}

                                        {/* Task Creation Form inline */}
                                        {isManager && (
                                            <div className="bg-gray-50 border-t border-gray-200 p-3">
                                                {!isCreatingThisTask ? (
                                                    <button
                                                        onClick={() => {
                                                            setActiveSectionIdForTask(section.id);
                                                            setNewTask(prev => ({ ...prev, sort_order: sectionTasks.length + 1 }));
                                                        }}
                                                        className="text-xs font-bold text-gray-600 hover:text-primary flex items-center gap-1 w-full p-2 border border-transparent hover:border-gray-200 hover:bg-white rounded transition-all"
                                                    >
                                                        <Plus size={14} /> Add new task to {section.title}
                                                    </button>
                                                ) : (
                                                    <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 rounded border border-gray-200 shadow-sm relative">
                                                        <div className="md:col-span-1">
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ord #</label>
                                                            <input type="number" required value={newTask.sort_order} onChange={e => setNewTask({ ...newTask, sort_order: parseInt(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary" />
                                                        </div>
                                                        <div className="md:col-span-4">
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Task Title <span className="text-red-500">*</span></label>
                                                            <input type="text" required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary" placeholder="E.g. Call for inspection" autoFocus />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status Rule</label>
                                                            <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary">
                                                                <option value="pending">Standard Duty</option>
                                                                <option value="hold_point">Hold Point</option>
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assignee</label>
                                                            <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-primary focus:border-primary">
                                                                <option value="">-- Optional --</option>
                                                                {employees.map(emp => (
                                                                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-2 flex items-end gap-2">
                                                            <button type="submit" disabled={saving} className="flex-1 py-1.5 bg-primary text-white font-bold rounded hover:bg-primary/90 disabled:opacity-50 text-xs h-[30px] flex justify-center items-center">
                                                                {saving ? <Loader2 className="animate-spin" size={14} /> : "Save"}
                                                            </button>
                                                            <button type="button" onClick={() => setActiveSectionIdForTask(null)} disabled={saving} className="py-1.5 px-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 disabled:opacity-50 text-xs h-[30px] flex justify-center items-center">
                                                                X
                                                            </button>
                                                        </div>
                                                        <div className="md:col-span-12 flex flex-col gap-2 mt-1">
                                                            <div className="flex items-center gap-2">
                                                                <input type="checkbox" id="req_pic" checked={newTask.requires_picture} onChange={e => setNewTask({ ...newTask, requires_picture: e.target.checked })} className="h-3.5 w-3.5 text-primary rounded ring-primary" />
                                                                <label htmlFor="req_pic" className="text-[11px] font-medium text-gray-600">Require photo upload for proof</label>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input type="checkbox" id="is_inspection" checked={newTask.is_inspection} onChange={e => setNewTask({ ...newTask, is_inspection: e.target.checked })} className="h-3.5 w-3.5 text-purple-600 rounded ring-purple-600" />
                                                                <label htmlFor="is_inspection" className="text-[11px] font-bold text-purple-700">This is an Inspection (Blocks subsequent tasks until completed)</label>
                                                            </div>
                                                        </div>
                                                    </form>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
