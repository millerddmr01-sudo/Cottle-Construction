"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";

export default function HoursDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Employee State
    const [projects, setProjects] = useState<any[]>([]);
    const [myHours, setMyHours] = useState<any[]>([]);
    const [newEntry, setNewEntry] = useState({
        project_id: "",
        date: new Date().toISOString().split('T')[0],
        hours_worked: ""
    });
    const [submitting, setSubmitting] = useState(false);

    // Foreman State
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
    const [approving, setApproving] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push("/login");
                return;
            }

            const currentUser = session.user;
            setUser(currentUser);

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("role")
                .eq("id", currentUser.id)
                .single();

            const role = profile?.role || null;
            setUserRole(role);

            // Fetch active projects for the dropdown
            const { data: projectsData } = await supabase
                .from("projects")
                .select("id, project_name")
                .in("status", ["active", "planning"])
                .order("project_name", { ascending: true });
            if (projectsData) setProjects(projectsData);

            // Fetch My Hours
            const { data: myHoursData } = await supabase
                .from("project_hours")
                .select("*, projects(project_name)")
                .eq("employee_id", currentUser.id)
                .order("date", { ascending: false })
                .order("created_at", { ascending: false });
            if (myHoursData) setMyHours(myHoursData);

            // If Foreman/Admin, fetch pending approvals
            if (role === 'admin' || role === 'foreman') {
                const { data: approvalsData } = await supabase
                    .from("project_hours")
                    .select("*, user_profiles(full_name), projects(project_name)")
                    .eq("approved", false)
                    .order("date", { ascending: true });
                if (approvalsData) setPendingApprovals(approvalsData);
            }

            setLoading(false);
        };

        fetchData();
    }, [router, supabase]);

    const handleSubmitHours = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { data, error } = await supabase
            .from("project_hours")
            .insert({
                project_id: newEntry.project_id,
                employee_id: user.id,
                date: newEntry.date,
                hours_worked: parseFloat(newEntry.hours_worked)
            })
            .select("*, projects(project_name)")
            .single();

        if (error) {
            alert("Error logging hours: " + error.message);
        } else if (data) {
            setMyHours([data, ...myHours]);
            setNewEntry({ ...newEntry, hours_worked: "" });

            // If they are a foreman/admin, auto-add to their own approval list for convenience
            if (userRole === 'admin' || userRole === 'foreman') {
                const { data: profileData } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single();
                setPendingApprovals([...pendingApprovals, { ...data, user_profiles: profileData }]);
            }
        }
        setSubmitting(false);
    };

    const handleApprove = async (id: string) => {
        setApproving(id);
        const { error } = await supabase
            .from("project_hours")
            .update({
                approved: true,
                approved_by: user.id
            })
            .eq("id", id);

        if (error) {
            alert("Error approving hours: " + error.message);
        } else {
            // Remove from pending list
            setPendingApprovals(pendingApprovals.filter(p => p.id !== id));
            // If it was their own hour entry, update that list too
            setMyHours(myHours.map(m => m.id === id ? { ...m, approved: true, approved_by: user.id } : m));
        }
        setApproving(null);
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex justify-center items-center py-12"><p className="text-gray-500">Loading Time Tracking...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <Link href="/dashboards" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4">
                        <ArrowLeft size={16} className="mr-1" /> Back to Dashboards
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Clock className="text-primary" size={32} /> Time Tracking
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">Log your daily hours and manage time entries.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Log Hours & Personal History */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Log Hours Form */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">Log My Hours</h2>
                            </div>
                            <form onSubmit={handleSubmitHours} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={newEntry.date}
                                            onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-gray-900"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Project</label>
                                        <select
                                            required
                                            value={newEntry.project_id}
                                            onChange={e => setNewEntry({ ...newEntry, project_id: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-gray-900"
                                        >
                                            <option value="" disabled>Select a project...</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.project_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Hours Worked</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            max="24"
                                            required
                                            value={newEntry.hours_worked}
                                            onChange={e => setNewEntry({ ...newEntry, hours_worked: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-gray-900"
                                            placeholder="e.g. 8"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full md:w-auto px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                        >
                                            {submitting ? "Submitting..." : "Submit Hours"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Recent History */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900">My Recent Entries</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Project</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Hours</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {myHours.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 italic">No hours logged yet.</td>
                                            </tr>
                                        ) : (
                                            myHours.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(entry.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">{entry.projects?.project_name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">{entry.hours_worked}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {entry.approved ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Approved
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Approvals (Foreman/Admin Only) */}
                    {(userRole === 'admin' || userRole === 'foreman') && (
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                                <div className="p-6 border-b border-gray-200 bg-secondary text-white">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <CheckCircle size={20} /> Team Approvals
                                    </h2>
                                    <p className="text-sm text-secondary-foreground/80 mt-1">Review unapproved time entries.</p>
                                </div>
                                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                                    {pendingApprovals.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-gray-500 italic">
                                            All caught up! No pending approvals.
                                        </div>
                                    ) : (
                                        pendingApprovals.map(entry => (
                                            <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{entry.user_profiles?.full_name || 'Unknown Employee'}</p>
                                                        <p className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-lg font-black text-primary">{entry.hours_worked}</span>
                                                        <span className="text-xs text-gray-500 block">hrs</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-3 truncate" title={entry.projects?.project_name}>
                                                    Project: <strong>{entry.projects?.project_name || 'Unknown'}</strong>
                                                </p>
                                                <button
                                                    onClick={() => handleApprove(entry.id)}
                                                    disabled={approving === entry.id}
                                                    className="w-full text-center px-4 py-2 border border-transparent rounded text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {approving === entry.id ? 'Approving...' : 'Approve Entry'}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
