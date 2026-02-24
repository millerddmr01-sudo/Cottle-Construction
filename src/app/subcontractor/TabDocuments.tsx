import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload, Trash2, FileText, Download } from "lucide-react";

export default function TabDocuments({ userId }: { userId: string }) {
    const supabase = createClient();
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("subcontractor_documents")
            .select("*")
            .eq("user_id", userId)
            .eq("document_type", "general")
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

        // 1. Upload to Storage
        const filePath = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
            .from("subcontractor_files")
            .upload(filePath, file);

        if (uploadError) {
            setError(`Upload failed: ${uploadError.message}`);
            setUploading(false);
            return;
        }

        // Get public URL (or signed URL if private, assuming we use public URL for simplicity if bucket is private it needs signed url. Let's use getPublicUrl and see, or we can just store the path and use createSignedUrl when viewing)
        // Since bucket is false (private), we store the path and generate signed urls on demand.
        const path = uploadData.path;

        // 2. Insert into Database
        const { error: dbError } = await supabase
            .from("subcontractor_documents")
            .insert({
                user_id: userId,
                document_type: "general",
                description: description || file.name,
                file_url: path
            });

        if (dbError) {
            setError(`Database error: ${dbError.message}`);
        } else {
            setSuccess("Document uploaded successfully.");
            setFile(null);
            setDescription("");
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

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">General Documents</h2>
            <p className="text-sm text-gray-500 mb-6">Upload and manage general project documents, site photos, or reports.</p>

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                <h3 className="font-semibold text-gray-800 mb-4">Upload New Document</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Project Site Photos"
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
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
                    {uploading ? "Uploading..." : "Upload Document"}
                </button>
            </form>

            {/* Document List */}
            <h3 className="font-semibold text-gray-800 mb-4">Your Documents</h3>
            {loading ? (
                <div className="text-center py-8 text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading...</div>
            ) : documents.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                    No documents uploaded yet.
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {documents.map((doc) => (
                            <li key={doc.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{doc.description}</p>
                                        <p className="text-xs text-gray-500">
                                            Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <button
                                        onClick={() => handleDownload(doc.file_url, doc.description)}
                                        className="text-gray-500 hover:text-primary p-2 transition-colors"
                                        title="Download"
                                    >
                                        <Download size={18} />
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
