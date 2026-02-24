"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, FileText } from "lucide-react";

export default function AdminDashboardPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const checkAdmin = async () => {
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

            if (profile?.role === "admin") {
                setIsAdmin(true);
            } else {
                router.push("/");
            }
        };
        checkAdmin();
    }, [router, supabase]);

    if (isAdmin === null) {
        return <div className="p-12 text-center text-gray-500">Loading admin dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
            <div className="container mx-auto max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-secondary mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage Cottle Construction operations and accounts.</p>
                </div>

                {/* Additional Admin Dashboard Cards placeholder */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    <Link href="/admin/customers" className="bg-white rounded-xl shadow-sm border border-primary p-6 flex flex-col items-center justify-center min-h-[150px] hover:bg-primary/5 transition-colors group">
                        <Users size={32} className="text-secondary mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-gray-900 text-lg">Manage Customers</h3>
                        <p className="text-sm text-gray-500 text-center mt-1">Upload files and issue invoices.</p>
                    </Link>
                    <Link href="/admin/subcontractors" className="bg-white rounded-xl shadow-sm border border-primary p-6 flex flex-col items-center justify-center min-h-[150px] hover:bg-primary/5 transition-colors group">
                        <Users size={32} className="text-primary mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-gray-900 text-lg">Manage Subcontractors</h3>
                        <p className="text-sm text-gray-500 text-center mt-1">View documents, W-9s, COIs, and approve invoices.</p>
                    </Link>
                    <Link href="/admin/employees" className="bg-white rounded-xl shadow-sm border border-primary p-6 flex flex-col items-center justify-center min-h-[150px] hover:bg-primary/5 transition-colors group">
                        <FileText size={32} className="text-primary mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-gray-900 text-lg">Manage Employees</h3>
                        <p className="text-sm text-gray-500 text-center mt-1">Manage staff, roles, and certifications.</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
