"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardsPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserAndRole = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();

            setUserRole(profile?.role || null);
            setLoading(false);
        };

        fetchUserAndRole();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
                <p className="text-xl text-gray-600">Loading dashboards...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
                        Your Dashboards
                    </h1>
                    <p className="mt-4 text-xl text-gray-500">
                        Select a dashboard to manage your projects and settings.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto grid gap-8 sm:grid-cols-2">
                    {/* Admin Dashboard */}
                    {userRole === "admin" && (
                        <div className="bg-white overflow-hidden shadow-lg rounded-xl flex flex-col items-center justify-center p-8 text-center border-t-4 border-primary hover:shadow-xl transition-shadow">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h3>
                            <p className="text-gray-500 mb-8 flex-grow">Manage employees, subcontractors, and overall system settings.</p>
                            <Link href="/admin" className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm">
                                Go to Admin
                            </Link>
                        </div>
                    )}

                    {/* Time Tracking Dashboard */}
                    {(userRole === "admin" || userRole === "foreman" || userRole === "employee") && (
                        <div className="bg-white overflow-hidden shadow-lg rounded-xl flex flex-col items-center justify-center p-8 text-center border-t-4 border-primary hover:shadow-xl transition-shadow">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Time Tracking</h3>
                            <p className="text-gray-500 mb-8 flex-grow">Log your daily hours and manage team approvals.</p>
                            <Link href="/dashboards/hours" className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm">
                                Track Time
                            </Link>
                        </div>
                    )}

                    {/* Projects Dashboard */}
                    {(userRole === "admin" || userRole === "foreman" || userRole === "employee") && (
                        <div className="bg-white overflow-hidden shadow-lg rounded-xl flex flex-col items-center justify-center p-8 text-center border-t-4 border-primary hover:shadow-xl transition-shadow">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Projects Dashboard</h3>
                            <p className="text-gray-500 mb-8 flex-grow">Manage ongoing projects, daily logs, and site operations.</p>
                            <Link href="/projects" className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm">
                                Go to Projects
                            </Link>
                        </div>
                    )}

                    {/* Checklist Dashboard */}
                    {(userRole === "admin" || userRole === "foreman" || userRole === "employee") && (
                        <div className="bg-white overflow-hidden shadow-lg rounded-xl flex flex-col items-center justify-center p-8 text-center border-t-4 border-primary hover:shadow-xl transition-shadow">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Checklist Dashboard</h3>
                            <p className="text-gray-500 mb-8 flex-grow">View and manage your assigned project checklist tasks.</p>
                            <Link href="/dashboards/checklists" className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm">
                                View Checklists
                            </Link>
                        </div>
                    )}

                    {/* Subcontractor Portal */}
                    {userRole === "subcontractor" && (
                        <div className="bg-white overflow-hidden shadow-lg rounded-xl flex flex-col items-center justify-center p-8 text-center border-t-4 border-primary hover:shadow-xl transition-shadow">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Subcontractor Portal</h3>
                            <p className="text-gray-500 mb-8 flex-grow">View your assigned tasks, documents, and submit updates.</p>
                            <Link href="/subcontractor" className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm">
                                Go to Portal
                            </Link>
                        </div>
                    )}

                    {/* Customer Portal */}
                    {userRole === "customer" && (
                        <div className="bg-white overflow-hidden shadow-lg rounded-xl flex flex-col items-center justify-center p-8 text-center border-t-4 border-primary hover:shadow-xl transition-shadow">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Customer Portal</h3>
                            <p className="text-gray-500 mb-8 flex-grow">View project progress, documents, and communications.</p>
                            <Link href="/customer" className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm">
                                Go to Portal
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
