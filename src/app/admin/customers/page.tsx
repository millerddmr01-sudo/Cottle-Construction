"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, Upload, FileText, Download, CheckCircle, Clock, XCircle, AlertCircle, Plus } from "lucide-react";

export default function AdminCustomersPage() {
    const router = useRouter();
    const supabase = createClient();

    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

    // Customer Details Data
    const [docs, setDocs] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Upload States
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<"project_document" | "scope_of_work" | "bid">("project_document");
    const [docTitle, setDocTitle] = useState("");
    const [docDesc, setDocDesc] = useState("");

    const [creatingInvoice, setCreatingInvoice] = useState(false);
    const [invNumber, setInvNumber] = useState("");
    const [invDesc, setInvDesc] = useState("");
    const [invAmount, setInvAmount] = useState("");
    const [invLink, setInvLink] = useState("");
    const [invFile, setInvFile] = useState<File | null>(null);

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
                fetchCustomers();
            } else {
                router.push("/");
            }
        };

        const fetchCustomers = async () => {
            const { data, error } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("role", "customer")
                .order("full_name", { ascending: true });

            if (!error && data && isMounted) {
                setCustomers(data);
            }
            if (isMounted) setLoading(false);
        };

        checkAdmin();
        return () => { isMounted = false; };
    }, [router, supabase]);

    const handleSelectCustomer = async (cust: any) => {
        setSelectedCustomer(cust);
        await refreshCustomerData(cust.id);
    };

    const refreshCustomerData = async (customerId: string) => {
        setDetailsLoading(true);
        const [docsRes, invRes] = await Promise.all([
            supabase.from("customer_documents").select("*").eq("user_id", customerId).order("created_at", { ascending: false }),
            supabase.from("customer_invoices").select("*").eq("user_id", customerId).order("created_at", { ascending: false })
        ]);

        if (!docsRes.error) setDocs(docsRes.data || []);
        if (!invRes.error) setInvoices(invRes.data || []);
        setDetailsLoading(false);
    };

    const handleBack = () => {
        setSelectedCustomer(null);
        setDocs([]);
        setInvoices([]);
    };

    const handleDownload = async (path: string, fallbackName: string) => {
        const { data, error } = await supabase.storage.from("customer_files").download(path);
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

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!docFile || !docTitle) return;

        setUploadingDoc(true);
        const filePath = `${selectedCustomer.id}/${docType}_${Date.now()}_${docFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError, data: uploadData } = await supabase.storage.from("customer_files").upload(filePath, docFile);

        if (uploadError) {
            alert("Upload failed: " + uploadError.message);
        } else {
            const { error: dbError } = await supabase.from("customer_documents").insert({
                user_id: selectedCustomer.id,
                document_type: docType,
                title: docTitle,
                description: docDesc || null,
                file_url: uploadData.path
            });

            if (dbError) alert("Database error: " + dbError.message);
            else {
                setDocFile(null);
                setDocTitle("");
                setDocDesc("");
                refreshCustomerData(selectedCustomer.id);
            }
        }
        setUploadingDoc(false);
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(invAmount.replace(/[^0-9.]/g, ''));
        if (!invNumber || isNaN(numAmount) || numAmount <= 0) return;

        setCreatingInvoice(true);
        let path = null;

        if (invFile) {
            const filePath = `${selectedCustomer.id}/invoices/${Date.now()}_${invFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { error: uploadError, data: uploadData } = await supabase.storage.from("customer_files").upload(filePath, invFile);
            if (uploadError) {
                alert("File upload failed: " + uploadError.message);
                setCreatingInvoice(false);
                return;
            }
            path = uploadData.path;
        }

        const { error: dbError } = await supabase.from("customer_invoices").insert({
            user_id: selectedCustomer.id,
            invoice_number: invNumber,
            description: invDesc || null,
            amount: numAmount,
            status: 'unpaid',
            file_url: path,
            payment_link: invLink || null
        });

        if (dbError) {
            alert("Database error: " + dbError.message);
        } else {
            setInvFile(null);
            setInvNumber("");
            setInvDesc("");
            setInvAmount("");
            setInvLink("");
            refreshCustomerData(selectedCustomer.id);
        }
        setCreatingInvoice(false);
    };

    const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
        const { error } = await supabase
            .from("customer_invoices")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", invoiceId);

        if (error) {
            alert("Failed to update status: " + error.message);
        } else {
            setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));
        }
    };

    if (isAdmin === null || loading) {
        return <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading admin view...</div>;
    }

    if (!selectedCustomer) {
        // List View
        return (
            <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <Link href="/admin" className="hover:text-primary transition-colors flex items-center">
                                <ChevronLeft size={16} /> Admin Dashboard
                            </Link>
                        </div>
                        <h1 className="text-3xl font-extrabold text-secondary mb-2">Manage Customers</h1>
                        <p className="text-gray-600">Select a customer to upload documents and issue invoices.</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {customers.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 italic">No customers found in the system.</div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {customers.map(cust => (
                                    <li key={cust.id}>
                                        <button
                                            onClick={() => handleSelectCustomer(cust)}
                                            className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                    {cust.full_name || cust.email}
                                                </h3>
                                                <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                                    <span>{cust.email}</span>
                                                    {cust.company_name && <span>• {cust.company_name}</span>}
                                                </div>
                                            </div>
                                            <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-semibold text-sm">
                                                Manage <ChevronLeft size={16} className="rotate-180" />
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
    return (
        <div className="min-h-screen bg-gray-50 pt-10 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="mb-8">
                    <button onClick={handleBack} className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-semibold mb-4">
                        <ChevronLeft size={16} /> Back to Customers
                    </button>
                    <h1 className="text-3xl font-extrabold text-secondary mb-2">
                        {selectedCustomer.full_name || selectedCustomer.email}
                    </h1>
                    <div className="text-gray-600 text-sm flex gap-4">
                        <span>{selectedCustomer.email}</span>
                        {selectedCustomer.phone_number && <span>• {selectedCustomer.phone_number}</span>}
                        {selectedCustomer.company_name && <span>• {selectedCustomer.company_name}</span>}
                    </div>
                </div>

                {detailsLoading ? (
                    <div className="py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading details...</div>
                ) : (
                    <div className="space-y-8">

                        {/* ISSUE NEW INVOICE */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                                <h2 className="text-xl font-bold text-gray-900">Issue New Invoice</h2>
                            </div>
                            <div className="p-6 bg-gray-50/30">
                                <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Invoice Number <span className="text-red-500">*</span></label>
                                        <input type="text" required value={invNumber} onChange={e => setInvNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="INV-001" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount ($) <span className="text-red-500">*</span></label>
                                        <input type="number" step="0.01" required value={invAmount} onChange={e => setInvAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Link (Quickbooks)</label>
                                        <input type="url" value={invLink} onChange={e => setInvLink(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="https://..." />
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                        <input type="text" value={invDesc} onChange={e => setInvDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. Deposit for Framing" />
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-3 text-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Attach PDF (Optional)</label>
                                            <input type="file" onChange={e => setInvFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" accept=".pdf" />
                                        </div>
                                        <button type="submit" disabled={creatingInvoice} className="whitespace-nowrap flex items-center gap-2 py-2 px-6 bg-primary text-white font-bold rounded-md hover:bg-primary/90 disabled:opacity-50 mt-4 md:mt-0">
                                            {creatingInvoice ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Issue Invoice
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* INVOICE LIST */}
                            {invoices.length > 0 && (
                                <div className="border-t border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inv #</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status & Updates</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">File</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {invoices.map(inv => (
                                                <tr key={inv.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{inv.invoice_number}<div className="text-xs font-normal text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</div></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Number(inv.amount).toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <select
                                                            value={inv.status}
                                                            onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                                                            className={`text-sm px-2 py-1 rounded-md border font-bold ${inv.status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                    inv.status === 'overdue' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                        inv.status === 'cancelled' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                                                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                                }`}
                                                        >
                                                            <option value="unpaid">Unpaid</option>
                                                            <option value="paid">Paid</option>
                                                            <option value="overdue">Overdue</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                        {inv.file_url ? (
                                                            <button onClick={() => handleDownload(inv.file_url, `Invoice_${inv.invoice_number}.pdf`)} className="text-primary hover:underline inline-flex items-center gap-1">
                                                                <Download size={16} /> File
                                                            </button>
                                                        ) : <span className="text-gray-300">N/A</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* UPLOAD DOCUMENTS */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50">
                                <h2 className="text-xl font-bold text-gray-900">Upload Project File</h2>
                            </div>
                            <div className="p-6 bg-gray-50/30">
                                <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">File Type</label>
                                        <select value={docType} onChange={e => setDocType(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
                                            <option value="project_document">General Project Document</option>
                                            <option value="scope_of_work">Scope of Work</option>
                                            <option value="bid">Bid / Proposal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Document Title <span className="text-red-500">*</span></label>
                                        <input type="text" required value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. Master Blueprint" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                        <input type="text" value={docDesc} onChange={e => setDocDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Brief description of the file..." />
                                    </div>
                                    <div className="md:col-span-2 text-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select File <span className="text-red-500">*</span></label>
                                            <input type="file" required onChange={e => setDocFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                                        </div>
                                        <button type="submit" disabled={uploadingDoc} className="whitespace-nowrap flex items-center gap-2 py-2 px-6 bg-primary text-white font-bold rounded-md hover:bg-primary/90 disabled:opacity-50 mt-4 md:mt-0">
                                            {uploadingDoc ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Upload File
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* DOCUMENT LIST */}
                            {docs.length > 0 && (
                                <div className="border-t border-gray-200 p-6">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Uploaded Files</h3>
                                    <ul className="space-y-3">
                                        {docs.map(doc => (
                                            <li key={doc.id} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded border">
                                                <div>
                                                    <div className="font-bold">{doc.title} <span className="text-xs font-normal text-gray-500 ml-2">({doc.document_type.replace(/_/g, ' ')})</span></div>
                                                    {doc.description && <div className="text-xs text-gray-600 mt-0.5">{doc.description}</div>}
                                                </div>
                                                <button onClick={() => handleDownload(doc.file_url, "document")} className="text-primary hover:underline font-semibold flex items-center gap-1">
                                                    <Download size={16} /> Download
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
