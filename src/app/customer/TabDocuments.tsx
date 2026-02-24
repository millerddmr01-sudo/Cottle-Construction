"use client";

import { useState, useEffect } from "react";
import { Loader2, Download, FileText, ClipboardList, HandCoins, FolderOpen } from "lucide-react";

export default function TabDocuments({ userId, supabase }: { userId: string, supabase: any }) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDocuments = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("customer_documents")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (!error && data) {
                setDocuments(data);
            }
            setLoading(false);
        };
        fetchDocuments();
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

    const getIcon = (type: string) => {
        switch (type) {
            case 'scope_of_work': return <ClipboardList className="text-blue-500" size={20} />;
            case 'bid': return <HandCoins className="text-green-500" size={20} />;
            default: return <FileText className="text-gray-500" size={20} />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'scope_of_work': return 'Scope of Work';
            case 'bid': return 'Bid / Proposal';
            default: return 'Project Document';
        }
    };

    if (loading) {
        return <div className="text-center py-12 text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading documents...</div>;
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Project Documents & Bids</h2>
            <p className="text-sm text-gray-500 mb-6">View and download files related to your project.</p>

            {documents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No documents available</h3>
                    <p className="text-gray-500">Your project documents, scopes of work, and bids will appear here once uploaded by the Cottle Construction team.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {documents.map((doc) => (
                            <li key={doc.id} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-gray-100 rounded-lg shrink-0 mt-1">
                                        {getIcon(doc.document_type)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{doc.title}</h3>
                                        {doc.description && <p className="text-sm text-gray-600 mt-1">{doc.description}</p>}
                                        <div className="flex gap-3 text-xs text-gray-500 mt-2 font-medium">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{getTypeLabel(doc.document_type)}</span>
                                            <span>Added {new Date(doc.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="sm:shrink-0 flex sm:flex-col justify-end gap-2">
                                    <button
                                        onClick={() => handleDownload(doc.file_url, `${doc.title.replace(/\s+/g, '_')}.pdf`)}
                                        className="flex items-center gap-2 justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors w-full"
                                    >
                                        <Download size={16} /> Download
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
