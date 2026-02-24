"use client";

import { useState, useEffect } from "react";
import { Loader2, Download, Receipt, ExternalLink, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function TabInvoices({ userId, supabase }: { userId: string, supabase: any }) {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("customer_invoices")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (!error && data) {
                setInvoices(data);
            }
            setLoading(false);
        };
        fetchInvoices();
    }, [userId, supabase]);

    const handleDownload = async (path: string, fallbackName: string) => {
        const { data, error } = await supabase.storage
            .from("customer_files")
            .download(path);

        if (error) {
            alert("Error downloading file: " + error.message);
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

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'paid':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle size={12} /> Paid</span>;
            case 'overdue':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><AlertCircle size={12} /> Overdue</span>;
            case 'cancelled':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"><XCircle size={12} /> Cancelled</span>;
            default: // unpaid
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200"><Clock size={12} /> Unpaid</span>;
        }
    };

    if (loading) {
        return <div className="text-center py-12 text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading invoices...</div>;
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invoices & Payments</h2>
            <p className="text-sm text-gray-500 mb-6">Review your project invoices and make secure payments.</p>

            {invoices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices found</h3>
                    <p className="text-gray-500">You currently have no open or past invoices.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice / Description</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {new Date(inv.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div className="font-bold">{inv.invoice_number}</div>
                                        {inv.description && <div className="text-gray-500 mt-1">{inv.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                        ${Number(inv.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <div className="flex items-center justify-end gap-3 font-semibold">
                                            {inv.file_url ? (
                                                <button
                                                    onClick={() => handleDownload(inv.file_url, `Invoice_${inv.invoice_number}.pdf`)}
                                                    className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                                                    title="Download PDF"
                                                >
                                                    <Download size={18} /> <span className="hidden sm:inline">PDF</span>
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 mr-2" title="No file attached"><Download size={18} /></span>
                                            )}

                                            {inv.payment_link && inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                                                <Link
                                                    href={inv.payment_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                                                >
                                                    Pay Now <ExternalLink size={16} className="opacity-80" />
                                                </Link>
                                            ) : inv.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-md border border-green-200">
                                                    Paid
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-md border border-gray-200 cursor-not-allowed" title="No payment link available">
                                                    Pay Now
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
