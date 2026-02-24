"use strict";

import { useState, useEffect, useRef } from "react";
import { Loader2, FileUp, Trash2, ExternalLink, Calendar, User, FileText } from "lucide-react";

export default function TabDocuments({ projectId, userRole, userId, supabase }: { projectId: string, userRole: string, userId: string, supabase: any }) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload Form State
    const [uploadForm, setUploadForm] = useState({
        name: "",
        description: "",
        file: null as File | null
    });

    const canEdit = userRole === 'admin' || userRole === 'foreman';

    useEffect(() => {
        let isMounted = true;
        const fetchDocuments = async () => {
            const { data } = await supabase
                .from("project_documents")
                .select("*, uploader:user_profiles(full_name)")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false });

            if (isMounted) {
                setDocuments(data || []);
                setLoading(false);
            }
        };
        fetchDocuments();
        return () => { isMounted = false; };
    }, [projectId, supabase]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadForm({ ...uploadForm, file: e.target.files[0] });
            // Auto-fill name based on file name if no name is set
            if (!uploadForm.name) {
                const nameWithoutExt = e.target.files[0].name.split('.').slice(0, -1).join('.');
                setUploadForm(prev => ({ ...prev, name: nameWithoutExt }));
            }
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.file) return;

        setUploading(true);
        const fileExt = uploadForm.file.name.split('.').pop();
        const fileName = `${projectId}/documents/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('project_files')
            .upload(fileName, uploadForm.file);

        if (uploadError) {
            alert("Error uploading file to storage: " + uploadError.message);
            setUploading(false);
            return;
        }

        // 2. Create Database Record
        const { data, error: dbError } = await supabase.from("project_documents").insert({
            project_id: projectId,
            uploaded_by: userId,
            file_path: fileName,
            name: uploadForm.name,
            description: uploadForm.description
        }).select("*, uploader:user_profiles(full_name)").single();

        if (dbError) {
            alert("Error saving document record: " + dbError.message);
            await supabase.storage.from('project_files').remove([fileName]);
        } else {
            setDocuments([data, ...documents]);
            setUploadForm({ name: "", description: "", file: null });
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setUploading(false);
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        // Delete from Storage
        if (filePath) await supabase.storage.from("project_files").remove([filePath]);

        // Delete from Database
        const { error: dbError } = await supabase.from("project_documents").delete().eq("id", id);
        if (dbError) {
            alert("Error deleting record: " + dbError.message);
        } else {
            setDocuments(documents.filter(d => d.id !== id));
        }
    };

    const handleViewDocument = async (path: string) => {
        const { data, error } = await supabase.storage.from('project_files').createSignedUrl(path, 60 * 60); // 1 hour expiry
        if (data && data.signedUrl) {
            window.open(data.signedUrl, '_blank');
        } else {
            alert("Could not open file: " + (error?.message || 'Unknown error'));
        }
    };

    if (loading) return <div className="py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading project documents...</div>;

    return (
        <div className="space-y-8">
            {/* Upload Section */}
            {canEdit && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><FileUp className="text-primary" /> Upload Project Document</h2>
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-4">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select File <span className="text-red-500">*</span></label>
                            <input
                                type="file"
                                required
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                        </div>
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Document Name <span className="text-red-500">*</span></label>
                            <input type="text" required value={uploadForm.name} onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="E.g., Approved Permit" />
                        </div>
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description (Optional)</label>
                            <input type="text" value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="Brief description..." />
                        </div>
                        <div className="lg:col-span-2 flex items-end">
                            <button type="submit" disabled={uploading || !uploadForm.file} className="w-full py-2 bg-primary text-white font-bold rounded hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center">
                                {uploading ? <Loader2 className="animate-spin" size={16} /> : "Upload"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Documents List Section */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">Project Documents</h2>
                {documents.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                        No documents uploaded for this project yet.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {documents.map((doc) => (
                                <li key={doc.id} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                                    <div className="flex items-start gap-4 flex-1 overflow-hidden">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                                            <FileText size={24} />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-base truncate">{doc.name}</h4>
                                            {doc.description && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{doc.description}</p>}
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                                <div className="flex items-center gap-1"><User size={12} /> <span className="truncate max-w-[150px]">{doc.uploader?.full_name || 'System'}</span></div>
                                                <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(doc.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:self-center ml-[3.25rem] sm:ml-0 flex-shrink-0">
                                        <button onClick={() => handleViewDocument(doc.file_path)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded font-bold text-xs transition-colors focus:outline-none">
                                            <ExternalLink size={14} /> Open
                                        </button>
                                        {(canEdit || doc.uploaded_by === userId) && (
                                            <button onClick={() => handleDelete(doc.id, doc.file_path)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-700 rounded transition-colors focus:outline-none" title="Delete Document">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
