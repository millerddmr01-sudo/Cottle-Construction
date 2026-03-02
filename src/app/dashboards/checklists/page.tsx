"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, CheckCircle, AlertTriangle, FileWarning, Clock, User, Briefcase, Camera } from "lucide-react";

export default function ChecklistDashboardPage() {
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    const [filterProject, setFilterProject] = useState<string>("all");
    const [filterAssignee, setFilterAssignee] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("pending_in_progress");

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("role, id")
                .eq("id", user.id)
                .single();

            if (!profile || (profile.role !== "admin" && profile.role !== "foreman" && profile.role !== "employee")) {
                router.push("/");
                return;
            }

            if (isMounted) {
                setUserRole(profile.role);
                setUserId(user.id);
            }

            const isManager = profile.role === "admin" || profile.role === "foreman";

            // Fetch tasks
            let allTasksQuery = supabase.from("project_tasks").select("*, project:projects(id, project_name), assignee:user_profiles(id, full_name)");

            if (!isManager) {
                // Find projects this employee has tasks on to fetch all tasks for those projects (for dependency resolution)
                const myTasksQuery = await supabase.from("project_tasks").select("project_id").eq("assigned_to", user.id);
                const myTasks = myTasksQuery.data || [];
                const projectIds = Array.from(new Set(myTasks.map(t => t.project_id)));
                if (projectIds.length > 0) {
                    allTasksQuery = allTasksQuery.in("project_id", projectIds);
                } else {
                    allTasksQuery = allTasksQuery.eq("project_id", "none");
                }
            }

            const { data: allTasksData } = await allTasksQuery;

            if (isMounted && allTasksData) {
                setTasks(allTasksData);

                // Extract unique projects
                const uniqueProjects = Array.from(new Map(allTasksData.map(t => [t.project?.id, t.project])).values()).filter(Boolean);
                setProjects(uniqueProjects);
            }

            if (isManager && isMounted) {
                const { data: empData } = await supabase
                    .from("user_profiles")
                    .select("id, full_name")
                    .in("role", ["employee", "foreman"])
                    .order("full_name", { ascending: true });
                setEmployees(empData || []);
            }

            if (isMounted) setLoading(false);
        };

        fetchData();
        return () => { isMounted = false; };
    }, [router, supabase]);

    const isManager = userRole === 'admin' || userRole === 'foreman';

    const updateTaskStatus = async (taskId: string, newStatus: string) => {
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;

        // Dependency check
        if (newStatus !== 'pending') {
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
            setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        }
    };

    const updateTaskAssignee = async (taskId: string, newAssigneeId: string) => {
        const { data, error } = await supabase
            .from("project_tasks")
            .update({ assigned_to: newAssigneeId || null })
            .eq("id", taskId)
            .select("*, project:projects(id, project_name), assignee:user_profiles(id, full_name)")
            .single();

        if (error) {
            alert("Failed to assign task: " + error.message);
        } else {
            setTasks(tasks.map(t => t.id === taskId ? data : t));
        }
    };

    // Filter tasks for display
    let displayTasks = tasks;

    // 1. Role filtering (Employees only see their own tasks)
    if (!isManager) {
        displayTasks = displayTasks.filter(t => t.assigned_to === userId);
    }

    // 2. Project filter
    if (filterProject !== "all") {
        displayTasks = displayTasks.filter(t => t.project_id === filterProject);
    }

    // 3. Assignee filter (Managers only)
    if (isManager && filterAssignee !== "all") {
        if (filterAssignee === "unassigned") {
            displayTasks = displayTasks.filter(t => !t.assigned_to);
        } else {
            displayTasks = displayTasks.filter(t => t.assigned_to === filterAssignee);
        }
    }

    // 4. Status filter
    if (filterStatus === "pending_in_progress") {
        displayTasks = displayTasks.filter(t => t.status !== "completed");
    } else if (filterStatus === "completed") {
        displayTasks = displayTasks.filter(t => t.status === "completed");
    }

    // Sort tasks grouping by project, then by section, then sort order
    displayTasks.sort((a, b) => {
        if (a.project_id !== b.project_id) return (a.project?.project_name || "").localeCompare(b.project?.project_name || "");
        if (a.section_id !== b.section_id) return a.section_id.localeCompare(b.section_id);
        return a.sort_order - b.sort_order;
    });

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'completed': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200"><CheckCircle size={12} className="mr-1 inline" /> Completed</span>;
            case 'in_progress': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">In Progress</span>;
            case 'hold_point': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200"><AlertTriangle size={12} className="mr-1 inline" /> Hold Point</span>;
            case 'inspection': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200"><FileWarning size={12} className="mr-1 inline" /> Inspection Req.</span>;
            default: return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">Pending</span>;
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading Checklist Dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-8 pb-20 px-4">
            <div className="container mx-auto max-w-7xl">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/dashboards" className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-semibold mb-4 w-fit">
                        <ChevronLeft size={16} /> Back to Dashboards
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-secondary mb-2">Checklist Dashboard</h1>
                            <p className="text-gray-600">
                                {isManager ? "Track and manage checklist items across all active company projects." : "View and update checklist items assigned to you."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:ring-primary focus:border-primary"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending_in_progress">Pending & In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Project</label>
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:ring-primary focus:border-primary"
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.project_name}</option>
                            ))}
                        </select>
                    </div>

                    {isManager && (
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Assignee</label>
                            <select
                                value={filterAssignee}
                                onChange={(e) => setFilterAssignee(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:ring-primary focus:border-primary"
                            >
                                <option value="all">All Assignees</option>
                                <option value="unassigned">Unassigned</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Task List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {displayTasks.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No checklist items found matching your filters.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {displayTasks.map(task => {
                                const isBlocked = tasks.some(t => t.section_id === task.section_id && t.sort_order < task.sort_order && (t.is_inspection || t.status === 'inspection') && t.status !== 'completed');

                                return (
                                    <div key={task.id} className={`p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center gap-4 ${task.status === 'completed' ? 'opacity-70 bg-gray-50' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <Link href={`/projects/${task.project_id}`} className="text-xs font-bold text-primary hover:underline uppercase tracking-wide">
                                                    {task.project?.project_name}
                                                </Link>
                                                <span className="text-gray-300">•</span>
                                                <StatusBadge status={task.status} />

                                                {task.is_inspection && <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">🔍 INSPECTION</span>}
                                                {task.requires_picture && <span className="text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Photo verification required"><Camera size={12} className="inline mr-1" /> PHOTO REQ</span>}
                                                {isBlocked && task.status !== 'completed' && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200"><AlertTriangle size={12} className="inline mr-1" /> BLOCKED</span>}
                                            </div>

                                            <h3 className={`text-base font-bold text-gray-900 truncate ${task.status === 'completed' ? 'line-through' : ''}`}>
                                                {task.title}
                                            </h3>

                                            {task.description && (
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0 mt-2 md:mt-0">
                                            {isManager ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-[10px] font-bold text-gray-700 uppercase">Assignee</span>
                                                    <select
                                                        value={task.assigned_to || ""}
                                                        onChange={(e) => updateTaskAssignee(task.id, e.target.value)}
                                                        className="text-xs font-bold text-gray-900 rounded-md py-1.5 px-2 border border-gray-300 bg-white focus:ring-primary focus:border-primary w-32"
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {employees.map(emp => (
                                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-[10px] font-bold text-gray-700 uppercase">Assignee</span>
                                                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1 bg-gray-100 px-2 py-1.5 rounded-md border border-gray-200 w-32 truncate">
                                                        <User size={12} className="shrink-0" />
                                                        {task.assignee?.full_name || "Unassigned"}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-[10px] font-bold text-gray-700 uppercase">Status</span>
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                                    disabled={isBlocked && task.status !== 'completed' && task.status !== 'inspection'}
                                                    className={`text-xs font-bold rounded-md py-1.5 pl-3 pr-8 focus:ring-primary focus:border-primary border-gray-300 disabled:opacity-50 w-36
                                                        ${task.status === 'completed' ? 'bg-green-50 text-green-900' :
                                                            task.status === 'inspection' ? 'bg-red-50 text-red-900' : 'bg-white text-gray-900'}
                                                    `}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="completed">Completed</option>
                                                    {(isManager || task.status === 'hold_point') && <option value="hold_point">Hold Point</option>}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
