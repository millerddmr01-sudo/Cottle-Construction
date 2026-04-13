"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, FileText, CheckCircle, Clock, XCircle, Download } from "lucide-react";

export default function AdminSubcontractorsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [subcontractors, setSubcontractors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSub, setSelectedSub] = useState<any | null>(null);

    // Subcontractor Creation State
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [newSubForm, setNewSubForm] = useState({
        email: "", password: "", fullName: "", companyName: "", phoneNumber: ""
    });

    // Subcontractor Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editSubForm, setEditSubForm] = useState({
        full_name: "", company_name: "", phone_number: ""
    });

    // Subcontractor Details Data
    const [docs, setDocs] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
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
                if (isMounted) setIsAdmin(true);
                fetchSubcontractors();
            } else {
                router.push("/");
            }
        };

        const fetchSubcontractors = async () => {
            const { data, error } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("role", "subcontractor")
                .order("full_name", { ascending: true });

            if (!error && data && isMounted) {
                setSubcontractors(data);
            }
            if (isMounted) setLoading(false);
        };

        checkAdmin();
        return () => { isMounted = false; };
    }, [router, supabase]);

    const handleCreateSubcontractor = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: newSubForm.email,
                    password: newSubForm.password,
                    fullName: newSubForm.fullName,
                    companyName: newSubForm.companyName,
                    phoneNumber: newSubForm.phoneNumber,
                    accountType: "subcontractor",
                }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Failed to create subcontractor");

            setSuccessMessage(`Successfully created account for ${newSubForm.email}`);

            const createdSub = {
                id: data.user.id,
                email: newSubForm.email,
                full_name: newSubForm.fullName,
                company_name: newSubForm.companyName || null,
                phone_number: newSubForm.phoneNumber || null,
                role: "subcontractor",
            };
            setSubcontractors(prev => [...prev, createdSub].sort((a, b) => ((a.company_name || a.full_name) || "").localeCompare((b.company_name || b.full_name) || "")));

            setNewSubForm({ email: "", password: "", fullName: "", companyName: "", phoneNumber: "" });
        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteSubcontractor = async (id: string, name: string) => {
        if (!confirm(`Are you absolutely sure you want to delete subcontractor ${name}? This will permanently remove their access, documents, and invoices.`)) return;

        try {
            const res = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSubcontractors(subcontractors.filter(c => c.id !== id));
        } catch (err: any) {
            alert("Error deleting subcontractor: " + err.message);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            const { data, error } = await supabase
                .from("user_profiles")
                .update({
                    full_name: editSubForm.full_name,
                    company_name: editSubForm.company_name,
                    phone_number: editSubForm.phone_number
                })
                .eq("id", editingId)
                .select()
                .single();

            if (error) {
                alert("Error updating subcontractor: " + error.message);
            } else if (data) {
                setSubcontractors(subcontractors.map(c => c.id === editingId ? data : c).sort((a, b) => ((a.company_name || a.full_name) || "").localeCompare((b.company_name || b.full_name) || "")));
                setEditingId(null);
            }
        } catch (err: any) {
            alert("Exception executing update: " + err.message);
        }
    };

    const startEditing = (sub: any) => {
        setEditingId(sub.id);
        setEditSubForm({
            full_name: sub.full_name || "",
            company_name: sub.company_name || "",
            phone_number: sub.phone_number || ""
        });
    };

    const handleSelectSub = async (sub: any) => {
        setSelectedSub(sub);
        setDetailsLoading(true);

        const [docsRes, invRes] = await Promise.all([
            supabase.from("subcontractor_documents").select("*").eq("user_id", sub.id).order("created_at", { ascending: false }),
            supabase.from("subcontractor_invoices").select("*").eq("user_id", sub.id).order("created_at", { ascending: false })
        ]);

        if (!docsRes.error) setDocs(docsRes.data || []);
        if (!invRes.error) setInvoices(invRes.data || []);

        setDetailsLoading(false);
    };

    const handleBack = () => {
        setSelectedSub(null);
        setDocs([]);
        setInvoices([]);
    };

    const handleDownload = async (path: string, fallbackName: string) => {
        const { data, error } = await supabase.storage.from("subcontractor_files").download(path);
        if (error) {
            alert("Download failed: " + error.message);
            return;
        }
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = path.split('/').pop() || fallbackName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
        const { error } = await supabase
            .from("subcontractor_invoices")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", invoiceId);

        if (error) {
            alert("Failed to update status: " + error.message);
        } else {
            // refresh
            setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));
        }
    };

    if (isAdmin === null || loading) {
        return <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading admin view...</div>;
    }

    if (!selectedSub) {
        // List View
        return (
            <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                <Link href="/admin" className="hover:text-primary transition-colors flex items-center">
                                    <ChevronLeft size={16} /> Admin Dashboard
                                </Link>
                            </div>
                            <h1 className="text-3xl font-extrabold text-secondary mb-2">Manage Subcontractors</h1>
                            <p className="text-gray-600">Register new subcontractors, edit profiles, or select one to view documents and invoices.</p>
                        </div>
                    </div>

                    {/* Create Subcontractor Account Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">Add New Subcontractor</h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleCreateSubcontractor} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Contact Full Name <span className="text-red-500">*</span></label>
                                        <div className="mt-1">
                                            <input type="text" required value={newSubForm.fullName} onChange={e => setNewSubForm({ ...newSubForm, fullName: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                                        <div className="mt-1">
                                            <input type="email" required value={newSubForm.email} onChange={e => setNewSubForm({ ...newSubForm, email: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Temporary Password <span className="text-red-500">*</span></label>
                                        <div className="mt-1">
                                            <input type="text" required minLength={6} value={newSubForm.password} onChange={e => setNewSubForm({ ...newSubForm, password: e.target.value })} placeholder="Min 6 characters" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                        <div className="mt-1">
                                            <input type="text" value={newSubForm.companyName} onChange={e => setNewSubForm({ ...newSubForm, companyName: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                        <div className="mt-1">
                                            <input type="text" value={newSubForm.phoneNumber} onChange={e => setNewSubForm({ ...newSubForm, phoneNumber: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black" />
                                        </div>
                                    </div>
                                </div>
                                {createError && <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">{createError}</div>}
                                {successMessage && <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">{successMessage}</div>}
                                <div className="flex justify-end pt-2">
                                    <button type="submit" disabled={creating} className="flex justify-center items-center py-2 px-6 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                                        {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : null} {creating ? "Creating..." : "Create Account"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {subcontractors.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 italic">No subcontractors found in the system.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcontractor/Contact</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {subcontractors.map(sub => (
                                            editingId === sub.id ? (
                                                <tr key={`edit-${sub.id}`} className="bg-blue-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-bold text-gray-900 text-sm mb-1">
                                                            <input type="text" value={editSubForm.full_name} onChange={e => setEditSubForm({ ...editSubForm, full_name: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-black" placeholder="Contact Full Name" />
                                                        </div>
                                                        <div className="text-sm text-gray-500">{sub.email} <span className="italic text-xs ml-1">(Cannot edit email inline)</span></div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <input type="text" value={editSubForm.company_name} onChange={e => setEditSubForm({ ...editSubForm, company_name: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-black" placeholder="Company Name" />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <input type="text" value={editSubForm.phone_number} onChange={e => setEditSubForm({ ...editSubForm, phone_number: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-black" placeholder="Phone Number" />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800 p-1.5 bg-green-100 hover:bg-green-200 rounded transition-colors"><CheckCircle size={18} /></button>
                                                            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 p-1.5 bg-gray-200 hover:bg-gray-300 rounded transition-colors"><XCircle size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={sub.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900 group-hover:text-primary transition-colors text-lg">{sub.full_name || sub.email}</div>
                                                        <div className="text-sm text-gray-500 mt-0.5">{sub.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                                        {sub.company_name || <span className="text-gray-400 italic font-normal">None</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {sub.phone_number || <span className="text-gray-400 italic">None</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-4">
                                                            <button onClick={() => handleSelectSub(sub)} className="text-primary hover:text-primary/80 font-bold flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors">
                                                                Manage <ChevronLeft size={16} className="rotate-180" />
                                                            </button>
                                                            <button onClick={() => startEditing(sub)} className="text-blue-500 hover:text-blue-700" title="Quick Edit Profile">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteSubcontractor(sub.id, sub.company_name || sub.full_name || sub.email)} className="text-red-500 hover:text-red-700" title="Delete Subcontractor">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
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

    // Detail View
    const w9s = docs.filter(d => d.document_type === "w9");
    const cois = docs.filter(d => d.document_type === "coi");
    const generalDocs = docs.filter(d => d.document_type === "general");

    return (
        <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="mb-8">
                    <button onClick={handleBack} className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-semibold mb-4">
                        <ChevronLeft size={16} /> Back to Subcontractors
                    </button>
                    <h1 className="text-3xl font-extrabold text-secondary mb-2">
                        {selectedSub.company_name || selectedSub.full_name || selectedSub.email}
                    </h1>
                    <div className="text-gray-600 text-sm flex gap-4">
                        <span>{selectedSub.email}</span>
                        {selectedSub.phone_number && <span>• {selectedSub.phone_number}</span>}
                        {selectedSub.address && <span>• {selectedSub.address}</span>}
                    </div>
                </div>

                {detailsLoading ? (
                    <div className="py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading details...</div>
                ) : (
                    <div className="space-y-8">
                        {/* INVOICES SECTION */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                                <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
                            </div>
                            {invoices.length === 0 ? (
                                <div className="p-6 text-gray-500 italic text-sm">No invoices submitted.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status & Actions</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">File</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {invoices.map(inv => (
                                                <tr key={inv.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(inv.created_at).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {inv.invoice_number}
                                                        <div className="text-xs text-gray-500 font-normal">{inv.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${Number(inv.amount).toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <select
                                                            value={inv.status}
                                                            onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                                                            className={`text-sm px-2 py-1 rounded-md border font-semibold ${inv.status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                    inv.status === 'approved' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                        inv.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                                }`}
                                                        >
                                                            <option value="submitted">Submitted</option>
                                                            <option value="approved">Approved</option>
                                                            <option value="paid">Paid</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                        {inv.file_url ? (
                                                            <button onClick={() => handleDownload(inv.file_url, `Invoice_${inv.invoice_number}.pdf`)} className="text-primary hover:underline inline-flex items-center gap-1">
                                                                <Download size={16} /> Download
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400">N/A</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* COMPLIANCE & GENERAL DOCS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                                    <h2 className="text-lg font-bold text-gray-900">Compliance Files</h2>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">W-9 Forms</h3>
                                    {w9s.length === 0 ? <p className="text-sm text-gray-500 mb-4 italic">No W-9 forms.</p> : (
                                        <ul className="mb-4 space-y-2">
                                            {w9s.map(doc => (
                                                <li key={doc.id} className="flex justify-between items-center text-sm border-b pb-2">
                                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                                    <button onClick={() => handleDownload(doc.file_url, "w9.pdf")} className="text-primary hover:underline">Download</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <h3 className="text-sm font-bold text-gray-700 mt-6 mb-2">COIs (Certificates of Insurance)</h3>
                                    {cois.length === 0 ? <p className="text-sm text-gray-500 italic">No COIs.</p> : (
                                        <ul className="space-y-2">
                                            {cois.map(doc => (
                                                <li key={doc.id} className="flex justify-between items-center text-sm border-b pb-2">
                                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                                    <button onClick={() => handleDownload(doc.file_url, "coi.pdf")} className="text-primary hover:underline">Download</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                                    <h2 className="text-lg font-bold text-gray-900">General Documents</h2>
                                </div>
                                <div className="p-6">
                                    {generalDocs.length === 0 ? <p className="text-sm text-gray-500 italic">No general documents.</p> : (
                                        <ul className="space-y-3">
                                            {generalDocs.map(doc => (
                                                <li key={doc.id} className="flex justify-between items-center text-sm border-b pb-2">
                                                    <div>
                                                        <div className="font-semibold">{doc.description}</div>
                                                        <div className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                    <button onClick={() => handleDownload(doc.file_url, "document.pdf")} className="text-primary hover:underline">Download</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
