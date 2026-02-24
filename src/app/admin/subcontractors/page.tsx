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
                            <p className="text-gray-600">Select a subcontractor to view their documents and invoices.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {subcontractors.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 italic">No subcontractors found in the system.</div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {subcontractors.map(sub => (
                                    <li key={sub.id}>
                                        <button
                                            onClick={() => handleSelectSub(sub)}
                                            className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                    {sub.company_name || sub.full_name || sub.email}
                                                </h3>
                                                <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                                    <span>{sub.email}</span>
                                                    {sub.phone_number && <span>• {sub.phone_number}</span>}
                                                </div>
                                            </div>
                                            <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-semibold text-sm">
                                                View Details <ChevronLeft size={16} className="rotate-180" />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
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
