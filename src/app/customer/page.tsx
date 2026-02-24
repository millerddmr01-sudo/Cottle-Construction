"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { UserCircle, FolderOpen, Receipt } from "lucide-react";

import TabProfile from "./TabProfile";
import TabDocuments from "./TabDocuments";
import TabInvoices from "./TabInvoices";

export default function CustomerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"profile" | "documents" | "invoices">("profile");
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        let isMounted = true;
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            const { data: userProfile } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", session.user.id)
                .single();

            if (userProfile?.role !== "customer" && userProfile?.role !== "admin") {
                router.push("/");
                return;
            }

            if (isMounted) {
                setUser(session.user);
                setProfile(userProfile);
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
                    <h1 className="text-3xl font-extrabold text-secondary mb-2">Customer Portal</h1>
                    <p className="text-gray-600">Manage your profile, view project documents, and review invoices.</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`py-4 px-6 font-medium text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <UserCircle size={18} /> Profile Information
                    </button>
                    <button
                        onClick={() => setActiveTab("documents")}
                        className={`py-4 px-6 font-medium text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <FolderOpen size={18} /> Project Documents & Bids
                    </button>
                    <button
                        onClick={() => setActiveTab("invoices")}
                        className={`py-4 px-6 font-medium text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Receipt size={18} /> Invoices & Payments
                    </button>
                </div>

                {/* Tab Content Areas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                    {activeTab === "profile" && <TabProfile userId={user.id} initialProfile={profile} supabase={supabase} />}
                    {activeTab === "documents" && <TabDocuments userId={user.id} supabase={supabase} />}
                    {activeTab === "invoices" && <TabInvoices userId={user.id} supabase={supabase} />}
                </div>
            </div>
        </div>
    );
}
