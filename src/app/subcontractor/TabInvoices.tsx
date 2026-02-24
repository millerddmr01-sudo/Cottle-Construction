import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload, Receipt, Download, Clock, CheckCircle, XCircle } from "lucide-react";

export default function TabInvoices({ userId }: { userId: string }) {
    const supabase = createClient();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [file, setFile] = useState<File | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("subcontractor_invoices")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setInvoices(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchInvoices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!file) {
            setError("Please attach an invoice file (PDF/Image).");
            return;
        }

        const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid amount.");
            return;
        }

        setSubmitting(true);

        // Upload file
        const filePath = `${userId}/invoices/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
            .from("subcontractor_files")
            .upload(filePath, file);

        if (uploadError) {
            setError(`File upload failed: ${uploadError.message}`);
            setSubmitting(false);
            return;
        }

        const path = uploadData.path;

        // Insert database record
        const { error: dbError } = await supabase
            .from("subcontractor_invoices")
            .insert({
                user_id: userId,
                invoice_number: invoiceNumber,
                description: description || null,
                amount: numAmount,
                status: 'submitted',
                file_url: path
            });

        if (dbError) {
            setError(`Database error: ${dbError.message}`);
        } else {
            setSuccess("Invoice submitted successfully!");
            setFile(null);
            setInvoiceNumber("");
            setDescription("");
            setAmount("");
            fetchInvoices(); // Refresh list
        }

        setSubmitting(false);
    };

    const handleDownload = async (path: string, fallbackName: string) => {
        const { data, error } = await supabase.storage
            .from("subcontractor_files")
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
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><CheckCircle size={12} /> Approved</span>;
            case 'paid':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} /> Paid</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} /> Rejected</span>;
            default: // submitted
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock size={12} /> Submitted</span>;
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invoices & Costs</h2>
            <p className="text-sm text-gray-500 mb-6">Submit new invoices securely and track their payment status.</p>

            <form onSubmit={handleUpload} className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                <h3 className="font-semibold text-gray-800 mb-4">Submit New Invoice</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                            type="text"
                            required
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="INV-1001"
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description / Project Info (Optional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Framing Phase 1 - 123 Main St Site"
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice File</label>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                            required
                            accept=".pdf,.png,.jpg,.jpeg"
                        />
                    </div>
                </div>

                {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
                {success && <div className="text-green-600 text-sm mb-4">{success}</div>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 py-2 px-4 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-white hover:text-primary transition-colors disabled:opacity-50"
                >
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                    {submitting ? "Submitting..." : "Submit Invoice"}
                </button>
            </form>

            <h3 className="font-semibold text-gray-800 mb-4">Invoice History</h3>
            {loading ? (
                <div className="text-center py-8 text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading...</div>
            ) : invoices.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                    No invoices submitted yet.
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Download</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(inv.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {inv.invoice_number}
                                        {inv.description && <span className="block text-xs text-gray-500 font-normal">{inv.description}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        ${Number(inv.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {inv.file_url ? (
                                            <button
                                                onClick={() => handleDownload(inv.file_url, `Invoice_${inv.invoice_number}.pdf`)}
                                                className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                                            >
                                                <Download size={16} /> File
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
    );
}
