import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload, FileText, Download, ShieldCheck } from "lucide-react";

export default function TabCompliance({ userId }: { userId: string }) {
    const supabase = createClient();
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [file, setFile] = useState<File | null>(null);
    const [documentType, setDocumentType] = useState<"w9" | "coi">("w9");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("subcontractor_documents")
            .select("*")
            .eq("user_id", userId)
            .in("document_type", ["w9", "coi"])
            .order("created_at", { ascending: false });

        if (!error && data) {
            setDocuments(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!file) {
            setError("Please select a file to upload.");
            return;
        }

        setUploading(true);

        const filePath = `${userId}/${documentType}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
            .from("subcontractor_files")
            .upload(filePath, file);

        if (uploadError) {
            setError(`Upload failed: ${uploadError.message}`);
            setUploading(false);
            return;
        }

        const path = uploadData.path;

        const { error: dbError } = await supabase
            .from("subcontractor_documents")
            .insert({
                user_id: userId,
                document_type: documentType,
                description: documentType === "w9" ? "W-9 Form" : "Certificate of Insurance",
                file_url: path
            });

        if (dbError) {
            setError(`Database error: ${dbError.message}`);
        } else {
            setSuccess(`${documentType.toUpperCase()} document uploaded successfully.`);
            setFile(null);
            fetchDocuments();
        }

        setUploading(false);
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

    const w9s = documents.filter(d => d.document_type === "w9");
    const cois = documents.filter(d => d.document_type === "coi");

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Compliance Documents</h2>
            <p className="text-sm text-gray-500 mb-6">Securely upload and manage your required W-9 forms and Certificates of Insurance (COI).</p>

            <form onSubmit={handleUpload} className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                <h3 className="font-semibold text-gray-800 mb-4">Upload Compliance File</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                        <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value as "w9" | "coi")}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black bg-white"
                        >
                            <option value="w9">W-9 Form</option>
                            <option value="coi">Certificate of Insurance (COI)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                            required
                        />
                    </div>
                </div>

                {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
                {success && <div className="text-green-600 text-sm mb-4">{success}</div>}

                <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center gap-2 py-2 px-4 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-white hover:text-primary transition-colors disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                    {uploading ? "Uploading..." : `Upload ${documentType.toUpperCase()}`}
                </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-green-600" /> W-9 Forms
                    </h3>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading...</div>
                    ) : w9s.length === 0 ? (
                        <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded border border-gray-100">No W-9 forms uploaded.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                            {w9s.map(doc => (
                                <li key={doc.id} className="p-3 hover:bg-gray-50 flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-900">{new Date(doc.created_at).toLocaleDateString()}</span>
                                    <button onClick={() => handleDownload(doc.file_url, "w9_form.pdf")} className="text-primary hover:underline flex items-center gap-1">
                                        <Download size={14} /> Download
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-blue-600" /> Certificates of Insurance
                    </h3>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading...</div>
                    ) : cois.length === 0 ? (
                        <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded border border-gray-100">No COIs uploaded.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                            {cois.map(doc => (
                                <li key={doc.id} className="p-3 hover:bg-gray-50 flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-900">{new Date(doc.created_at).toLocaleDateString()}</span>
                                    <button onClick={() => handleDownload(doc.file_url, "certificate_of_insurance.pdf")} className="text-primary hover:underline flex items-center gap-1">
                                        <Download size={14} /> Download
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
