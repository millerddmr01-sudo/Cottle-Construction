"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck, Receipt } from "lucide-react";
import TabDocuments from "./TabDocuments";
import TabCompliance from "./TabCompliance";
import TabInvoices from "./TabInvoices";

export default function SubcontractorDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"documents" | "compliance" | "invoices">("documents");
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        let isMounted = true;
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();

            if (profile?.role !== "subcontractor" && profile?.role !== "admin") {
                router.push("/");
                return;
            }

            if (isMounted) {
                setUser(session.user);
                setLoading(false);
            }
        };

        checkUser();
        return () => { isMounted = false; };
    }, [router, supabase]);

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-secondary mb-2">Subcontractor Portal</h1>
                    <p className="text-gray-600">Manage your documents, compliance files, and invoices.</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("documents")}
                        className={`py-4 px-6 font-medium text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <FileText size={18} /> General Documents
                    </button>
                    <button
                        onClick={() => setActiveTab("compliance")}
                        className={`py-4 px-6 font-medium text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'compliance' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <ShieldCheck size={18} /> Compliance (W-9 / COI)
                    </button>
                    <button
                        onClick={() => setActiveTab("invoices")}
                        className={`py-4 px-6 font-medium text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Receipt size={18} /> Invoices & Costs
                    </button>
                </div>

                {/* Tab Content Areas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                    {activeTab === "documents" && <TabDocuments userId={user.id} />}
                    {activeTab === "compliance" && <TabCompliance userId={user.id} />}
                    {activeTab === "invoices" && <TabInvoices userId={user.id} />}
                </div>
            </div>
        </div>
    );
}
