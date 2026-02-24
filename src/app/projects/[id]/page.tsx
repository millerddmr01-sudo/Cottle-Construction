"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, Info, ListTodo, ClipboardEdit, Image as ImageIcon, Pencil, Check, X, LayoutDashboard, BarChart3, Layers, CheckSquare, FileText, Image } from "lucide-react";

import TabSummary from "./TabSummary";
import TabOverview from "./TabOverview";
import TabChecklist from "./TabChecklist";
import TabForemanDaily from "./TabForemanDaily";
import TabGallery from "./TabGallery";
import TabDocuments from "./TabDocuments";

export default function ProjectDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [supabase] = useState(() => createClient());
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"Summary" | "Scope & Details" | "Checklist" | "Daily Reports" | "Photos" | "Documents">("Summary");

    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState("");
    const [savingName, setSavingName] = useState(false);

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
                .select("role")
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

            const { data: projectData, error } = await supabase
                .from("projects")
                .select("*, customer:user_profiles(full_name, company_name, email, phone_number)")
                .eq("id", projectId)
                .single();

            if (error || !projectData) {
                router.push("/projects");
                return;
            }

            if (isMounted) {
                setProject(projectData);
                setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [projectId, router, supabase]);

    if (loading) {
        return <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading project details...</div>;
    }

    const handleSaveName = async () => {
        if (!editNameValue.trim()) return;
        setSavingName(true);
        const { error } = await supabase
            .from("projects")
            .update({ project_name: editNameValue.trim() })
            .eq("id", project.id);

        if (!error) {
            setProject({ ...project, project_name: editNameValue.trim() });
            setIsEditingName(false);
        } else {
            alert("Error updating project name: " + error.message);
        }
        setSavingName(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-8 pb-20 px-4">
            <div className="container mx-auto max-w-7xl">

                {/* Header */}
                <div className="mb-6">
                    <Link href="/projects" className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-semibold mb-4 w-fit">
                        <ChevronLeft size={16} /> Back to Projects Directory
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            {isEditingName ? (
                                <div className="flex items-center gap-2 mb-1">
                                    <input
                                        type="text"
                                        value={editNameValue}
                                        onChange={(e) => setEditNameValue(e.target.value)}
                                        className="text-3xl font-extrabold text-secondary bg-white border border-gray-300 rounded px-2 py-1 focus:ring-primary focus:border-primary w-full max-w-md"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveName} disabled={savingName} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded">
                                        {savingName ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                    </button>
                                    <button onClick={() => setIsEditingName(false)} disabled={savingName} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded">
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <h1 className="text-3xl font-extrabold text-secondary mb-1 flex items-center gap-3">
                                    {project.project_name}
                                    {(userRole === 'admin' || userRole === 'foreman') && (
                                        <button
                                            onClick={() => {
                                                setEditNameValue(project.project_name);
                                                setIsEditingName(true);
                                            }}
                                            className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                            title="Edit Project Name"
                                        >
                                            <Pencil size={20} />
                                        </button>
                                    )}
                                </h1>
                            )}
                            <p className="text-gray-600 font-medium flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                                    ${project.status === 'Pre-con' || project.status === 'Job Kick-off' || project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                        project.status === 'Approved' || project.status === 'Paid' || project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            project.status === 'Invoice Submitted' || project.status === 'Post Project' ? 'bg-purple-100 text-purple-800' :
                                                project.status === 'Bid Submitted' ? 'bg-yellow-100 text-yellow-800' :
                                                    project.status === 'hold' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800'}`}
                                >
                                    {project.status || 'Planning & Estimate'}
                                </span>
                                • {project.address}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="w-full bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <nav className="-mb-px flex space-x-1 sm:space-x-4">
                            {["Summary", "Scope & Details", "Checklist", "Daily Reports", "Photos", "Documents"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-bold w-full uppercase tracking-wider
                                ${activeTab === tab ? "text-primary border-b-2 border-primary bg-primary/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                                >
                                    <span className="mb-1">
                                        {tab === "Summary" && <BarChart3 size={18} />}
                                        {tab === "Scope & Details" && <Layers size={18} />}
                                        {tab === "Checklist" && <CheckSquare size={18} />}
                                        {tab === "Daily Reports" && <FileText size={18} />}
                                        {tab === "Photos" && <Image size={18} />}
                                        {tab === "Documents" && <FileText size={18} />}
                                    </span>
                                    <span className="hidden sm:inline">{tab}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Tab Content Areas */}
                <div className="min-h-[500px]">
                    {activeTab === "Summary" && <TabSummary project={project} userRole={userRole!} supabase={supabase} setProject={setProject} />}
                    {activeTab === "Scope & Details" && <TabOverview project={project} userRole={userRole!} supabase={supabase} setProject={setProject} />}
                    {activeTab === "Checklist" && <TabChecklist projectId={project.id} userRole={userRole!} userId={userId!} supabase={supabase} />}
                    {activeTab === "Daily Reports" && (userRole === 'admin' || userRole === 'foreman') && <TabForemanDaily projectId={project.id} userRole={userRole!} userId={userId!} supabase={supabase} />}
                    {activeTab === "Photos" && <TabGallery projectId={project.id} userRole={userRole!} userId={userId!} supabase={supabase} />}
                    {activeTab === "Documents" && <TabDocuments projectId={project.id} userRole={userRole!} userId={userId!} supabase={supabase} />}
                </div>

            </div>
        </div>
    );
}
