"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Calendar, Clock, MapPin, ChevronRight, Activity, PauseCircle, CheckCircle2, Trash2 } from "lucide-react";

export default function ProjectsDirectory() {
    const router = useRouter();
    const supabase = createClient();

    const [userRole, setUserRole] = useState<string | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<"all" | "project" | "bid" | "service">("all");

    // Create Project State
    const [isCreating, setIsCreating] = useState(false);
    const [newProject, setNewProject] = useState({
        project_name: "",
        customer_id: "",
        address: "",
        start_date: "",
        estimated_completion_date: "",
        estimated_hours: "",
        project_type: "project"
    });

    // New Customer State
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({
        full_name: "",
        email: "",
        password: ""
    });

    useEffect(() => {
        let isMounted = true;
        const checkAccess = async () => {
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

            if (!profile || (profile.role !== "admin" && profile.role !== "foreman" && profile.role !== "employee")) {
                router.push("/");
                return;
            }

            if (isMounted) setUserRole(profile.role);

            // Fetch Projects
            const { data: projectsData, error: projError } = await supabase
                .from("projects")
                .select("*, customer:user_profiles(full_name, company_name)")
                .order("created_at", { ascending: false });

            if (!projError && isMounted) setProjects(projectsData || []);

            // Fetch Customers (for the create dropdown, admins/foremen only)
            if (profile.role === "admin" || profile.role === "foreman") {
                const { data: custData } = await supabase
                    .from("user_profiles")
                    .select("id, full_name, company_name")
                    .eq("role", "customer")
                    .order("full_name", { ascending: true });
                if (isMounted) setCustomers(custData || []);
            }

            if (isMounted) setLoading(false);
        };

        checkAccess();
        return () => { isMounted = false; };
    }, [router, supabase]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        let finalCustomerId = newProject.customer_id;

        if (isNewCustomer && newCustomerData.email && newCustomerData.full_name && newCustomerData.password) {
            // Create customer first
            try {
                const response = await fetch("/api/admin/create-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: newCustomerData.email,
                        password: newCustomerData.password,
                        fullName: newCustomerData.full_name,
                        accountType: "customer",
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to create customer");
                }
                finalCustomerId = data.user.id;
            } catch (err: any) {
                alert("Error creating customer: " + err.message);
                setIsCreating(false);
                return;
            }
        }

        let customerInitials = "XX";
        if (isNewCustomer && newCustomerData.full_name) {
            const names = newCustomerData.full_name.trim().split(" ");
            if (names.length >= 2) {
                customerInitials = (names[0][0] + names[names.length - 1][0]).toUpperCase();
            } else if (names[0]) {
                customerInitials = names[0].substring(0, 2).toUpperCase();
            }
        } else if (finalCustomerId) {
            const customer = customers.find(c => c.id === finalCustomerId);
            if (customer) {
                const nameToUse = customer.company_name || customer.full_name || "XX";
                const names = nameToUse.trim().split(" ");
                if (names.length >= 2) {
                    customerInitials = (names[0][0] + names[names.length - 1][0]).toUpperCase();
                } else if (names[0]) {
                    customerInitials = names[0].substring(0, 2).toUpperCase();
                }
            }
        }

        let typeCode = "02";
        if (newProject.project_type === "bid") typeCode = "01";
        else if (newProject.project_type === "service") typeCode = "03";

        const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
        const nextSequence = ((count || 0) + 1).toString().padStart(4, '0');
        const generatedJobNumber = `${customerInitials}-${typeCode}-${nextSequence}`;

        const { data, error } = await supabase.from("projects").insert({
            project_name: newProject.project_name,
            customer_id: finalCustomerId || null,
            address: newProject.address,
            start_date: newProject.start_date || null,
            estimated_completion_date: newProject.estimated_completion_date || null,
            estimated_hours: newProject.estimated_hours ? parseFloat(newProject.estimated_hours) : null,
            project_type: newProject.project_type,
            job_number: generatedJobNumber,
            status: 'planning'
        }).select().single();

        if (error) {
            alert("Error creating project: " + error.message);
            setIsCreating(false);
        } else {
            // Auto-generate Post Project Default Checklist Items
            try {
                const { data: sectionData, error: sectionError } = await supabase.from("project_checklist_sections").insert({
                    project_id: data.id,
                    phase: 'post_project',
                    title: 'Project Closeout',
                    sort_order: 1,
                    allowed_roles: ["admin", "foreman", "employee"]
                }).select().single();

                if (sectionData && !sectionError) {
                    const defaultTasks = [
                        "Statement of Work sent to customer",
                        "All expenses have been added to project",
                        "All employee hours have been added to project",
                        "Invoice created and sent",
                        "Customer follow-up"
                    ];

                    const tasksToInsert = defaultTasks.map((title, index) => ({
                        project_id: data.id,
                        section_id: sectionData.id,
                        title,
                        description: "",
                        sort_order: index + 1,
                        status: "pending",
                        requires_picture: false,
                        is_inspection: false
                    }));

                    await supabase.from("project_tasks").insert(tasksToInsert);
                }
            } catch (err) {
                console.error("Failed to generate default checklist items:", err);
            }

            router.push(`/projects/${data.id}`);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'active':
            case 'In progress':
            case 'Pre-con':
            case 'Job Kick-off':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Activity size={12} /> {status === 'In progress' ? 'In Progress' : status === 'active' ? 'Active' : status}</span>;
            case 'completed':
            case 'Completed':
            case 'Approved':
            case 'Paid':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 size={12} /> {status === 'completed' || status === 'Completed' ? 'Completed' : status}</span>;
            case 'hold':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><PauseCircle size={12} /> On Hold</span>;
            case 'Ready for Billing':
            case 'Invoice Submitted':
            case 'Post Project':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><Activity size={12} /> {status}</span>;
            case 'Bid Submitted':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Activity size={12} /> {status}</span>;
            case 'Planning & Estimate':
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock size={12} /> {status || 'Planning & Estimate'}</span>;
        }
    };

    const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectName: string) => {
        e.preventDefault(); // Prevent navigating to the project page
        e.stopPropagation();

        if (!confirm(`Are you absolutely sure you want to delete "${projectName}"? This will delete all tasks, photos, reports, and materials associated with it. This cannot be undone.`)) {
            return;
        }

        setDeletingId(projectId);

        const { error } = await supabase
            .from("projects")
            .delete()
            .eq("id", projectId);

        if (error) {
            alert("Error deleting project: " + error.message);
        } else {
            setProjects(projects.filter(p => p.id !== projectId));
        }

        setDeletingId(null);
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading Projects Directory...</div>;
    }

    const filteredProjects = projects.filter(p => filterType === "all" || p.project_type === filterType);

    return (
        <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-secondary mb-2">Projects Directory</h1>
                        <p className="text-gray-600">Select a project to view its scope, checklist, and requirements.</p>
                    </div>
                </div>

                {/* Create Project Card (Admin/Foreman Only) */}
                {(userRole === 'admin' || userRole === 'foreman') && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus className="text-primary" /> Create New Project</h2>
                        <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Project Name <span className="text-red-500">*</span></label>
                                <input type="text" required value={newProject.project_name} onChange={e => setNewProject({ ...newProject, project_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="e.g. Smith Residence Framing" />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Project Type <span className="text-red-500">*</span></label>
                                <select required value={newProject.project_type} onChange={e => setNewProject({ ...newProject, project_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                                    <option value="bid">Bid</option>
                                    <option value="project">Project</option>
                                    <option value="service">Service</option>
                                </select>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Job Site Address <span className="text-red-500">*</span></label>
                                <input type="text" required value={newProject.address} onChange={e => setNewProject({ ...newProject, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="123 Main St..." />
                            </div>
                            <div className="lg:col-span-4">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="block text-xs font-bold text-gray-700 uppercase">Customer</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsNewCustomer(!isNewCustomer)}
                                        className="text-xs font-bold text-primary hover:underline"
                                    >
                                        {isNewCustomer ? "Select Existing Customer" : "+ Add New Customer"}
                                    </button>
                                </div>
                                {!isNewCustomer ? (
                                    <select value={newProject.customer_id} onChange={e => setNewProject({ ...newProject, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                                        <option value="">-- Select Customer (Optional) --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.full_name || c.company_name || c.id}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name <span className="text-red-500">*</span></label>
                                            <input type="text" required={isNewCustomer} value={newCustomerData.full_name} onChange={e => setNewCustomerData({ ...newCustomerData, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="Customer Name" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email <span className="text-red-500">*</span></label>
                                            <input type="email" required={isNewCustomer} value={newCustomerData.email} onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="email@example.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Temp Password <span className="text-red-500">*</span></label>
                                            <input type="text" required={isNewCustomer} minLength={6} value={newCustomerData.password} onChange={e => setNewCustomerData({ ...newCustomerData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="Min 6 chars" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estimated Start</label>
                                <input type="date" value={newProject.start_date} onChange={e => setNewProject({ ...newProject, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                            </div>
                            <div className="lg:col-span-2 flex items-end">
                                <button type="submit" disabled={isCreating} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white font-bold rounded-md hover:bg-primary/90 disabled:opacity-50">
                                    {isCreating ? <Loader2 className="animate-spin" size={16} /> : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Filter Controls */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => setFilterType("all")} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filterType === "all" ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>All Projects</button>
                    <button onClick={() => setFilterType("project")} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filterType === "project" ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>Projects</button>
                    <button onClick={() => setFilterType("bid")} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filterType === "bid" ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>Bids</button>
                    <button onClick={() => setFilterType("service")} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filterType === "service" ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>Service Work</button>
                </div>

                {/* Projects Grid */}
                {filteredProjects.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
                        No projects found for this filter.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`} className={`group bg-white rounded-xl shadow-sm border-2 ${project.project_type === 'service' ? 'border-red-500' : 'border-primary'} overflow-hidden hover:shadow-md transition-all flex flex-col h-full`}>
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <StatusBadge status={project.status} />
                                        <div className="flex items-center gap-2">
                                            {userRole === 'admin' && (
                                                <button
                                                    onClick={(e) => handleDeleteProject(e, project.id, project.project_name)}
                                                    disabled={deletingId === project.id}
                                                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete Project"
                                                >
                                                    {deletingId === project.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                </button>
                                            )}
                                            <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{project.job_number || 'NO-JOB-NO'}</span>
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2">{project.project_name}</h3>
                                    </div>

                                    {project.customer && (
                                        <p className="text-sm text-gray-500 font-medium mt-1">
                                            {project.customer.company_name || project.customer.full_name}
                                        </p>
                                    )}

                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{project.address}</span>
                                        </div>
                                        {project.start_date && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar size={16} className="text-gray-400 shrink-0" />
                                                <span>Starts: {new Date(project.start_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    <span>View Details</span>
                                    <span>{project.estimated_hours ? `${project.estimated_hours} Est. Hrs` : 'No Time Est.'}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}
