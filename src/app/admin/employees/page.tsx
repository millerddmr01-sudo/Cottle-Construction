"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ChevronLeft, Search, UserCircle, HardHat, FileBadge } from "lucide-react";

export default function AdminEmployeesPage() {
    const router = useRouter();
    const supabase = createClient();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Employee Creation Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [accountType, setAccountType] = useState<"employee" | "foreman" | "admin">("employee");

    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployees = async () => {
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

            if (profile?.role !== "admin") {
                router.push("/");
                return;
            }

            const { data: employeeData, error } = await supabase
                .from("user_profiles")
                .select("*")
                .in("role", ["employee", "foreman"])
                .order("full_name", { ascending: true });

            if (error) {
                console.error("Error fetching employees:", error);
            } else {
                setEmployees(employeeData || []);
            }
            setLoading(false);
        };

        fetchEmployees();
    }, [router, supabase]);

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    fullName,
                    accountType,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create user");
            }

            setSuccessMessage(`Successfully created ${accountType} account for ${email}`);

            // Optimistically add new user to the UI list
            const newEmployee = {
                id: data.user.id,
                email: email,
                full_name: fullName,
                role: accountType,
            };
            setEmployees(prev => [...prev, newEmployee].sort((a, b) => a.full_name.localeCompare(b.full_name)));

            setEmail("");
            setPassword("");
            setFullName("");
        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading employees...</div>;
    }

    const filteredEmployees = employees.filter(emp =>
        (emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-8 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-semibold mb-4 w-fit">
                        <ChevronLeft size={16} /> Back to Admin Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-secondary mb-2">Employee Database</h1>
                            <p className="text-gray-600">Manage Cottle Construction staff, roles, and compliance certifications.</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or badge ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Create Employee Account Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                        <h2 className="text-xl font-bold text-gray-900">Create Employee Account</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Bypass standard registration to instantly create and confirm employee and foreman accounts.
                        </p>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleCreateEmployee} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role</label>
                                    <div className="mt-1">
                                        <select
                                            value={accountType}
                                            onChange={(e) => setAccountType(e.target.value as any)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black bg-white"
                                        >
                                            <option value="employee">Employee</option>
                                            <option value="foreman">Foreman</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <div className="mt-1">
                                        <input
                                            type="text" required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                    <div className="mt-1">
                                        <input
                                            type="email" required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                                    <div className="mt-1">
                                        <input
                                            type="text" required minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Provide to employee"
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                        />
                                    </div>
                                </div>
                            </div>

                            {createError && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                                    {createError}
                                </div>
                            )}

                            {successMessage && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                                    {successMessage}
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="py-2 px-6 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Employee Roster */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {filteredEmployees.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No employees found matching your criteria.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Badge ID</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredEmployees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                        {emp.role === 'foreman' ? <HardHat size={20} /> : <UserCircle size={20} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{emp.full_name || 'Unnamed User'}</div>
                                                        <div className="text-sm text-gray-500">{emp.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                                                    ${emp.role === 'foreman' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}
                                                >
                                                    {emp.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium">{emp.employee_id || <span className="text-gray-400 italic">Not set</span>}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1">{emp.job_description || 'General Labor'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">{emp.phone_number || <span className="text-gray-400 italic">No phone</span>}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/admin/employees/${emp.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-bold shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                                >
                                                    <FileBadge size={16} className="text-primary" /> Manage
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
