"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, UploadCloud, Image as ImageIcon, Trash2, Calendar, User, Search, Map } from "lucide-react";
import Image from "next/image";

export default function TabGallery({ projectId, userRole, userId, supabase }: { projectId: string, userRole: string, userId: string, supabase: any }) {
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [filterParams, setFilterParams] = useState("all");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload Form State
    const [uploadForm, setUploadForm] = useState({
        photo_type: "general",
        description: "",
        file: null as File | null
    });

    useEffect(() => {
        let isMounted = true;
        const fetchPhotos = async () => {
            const { data } = await supabase
                .from("project_photos")
                .select("*, uploader:user_profiles(full_name)")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false });

            if (isMounted) {
                setPhotos(data || []);
                setLoading(false);
            }
        };
        fetchPhotos();
        return () => { isMounted = false; };
    }, [projectId, supabase]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadForm({ ...uploadForm, file: e.target.files[0] });
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.file) return;

        setUploading(true);
        const fileExt = uploadForm.file.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('project_files')
            .upload(fileName, uploadForm.file);

        if (uploadError) {
            alert("Error uploading file to storage: " + uploadError.message);
            setUploading(false);
            return;
        }

        // 2. Get Public URL (Even though it's a private bucket, we get a signed URL or public URL depending on setup. Let's use createSignedUrl for private buckets for security, but for simplicity of this demo if it was forced public we use getPublicUrl. To be safe, we will just store the path and generate signed URLs on load, or we can use getPublicUrl if we make the bucket public. We will assume the viewer component handles signed URLs or it's implicitly public for authenticated users via RLS if we store the path.)
        // We will store the path.
        const filePath = fileName;

        // 3. Create Database Record
        const { data, error: dbError } = await supabase.from("project_photos").insert({
            project_id: projectId,
            uploaded_by: userId,
            photo_url: filePath,
            photo_type: uploadForm.photo_type,
            description: uploadForm.description
        }).select("*, uploader:user_profiles(full_name)").single();

        if (dbError) {
            alert("Error saving photo record: " + dbError.message);
        } else {
            setPhotos([data, ...photos]);
            setUploadForm({ photo_type: "general", description: "", file: null });
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setUploading(false);
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm("Are you sure you want to delete this photo?")) return;

        // Delete from Storage
        const { error: storageError } = await supabase.storage.from("project_files").remove([filePath]);
        if (storageError) console.error("Error deleting from storage:", storageError.message);

        // Delete from Database
        const { error: dbError } = await supabase.from("project_photos").delete().eq("id", id);
        if (dbError) {
            alert("Error deleting record: " + dbError.message);
        } else {
            setPhotos(photos.filter(p => p.id !== id));
        }
    };

    const isManager = userRole === 'admin' || userRole === 'foreman';
    const filteredPhotos = filterParams === 'all' ? photos : photos.filter(p => p.photo_type === filterParams);

    // Component to render the image. Because it's a private bucket, we need to fetch a signed URL.
    const SecureImage = ({ path, alt }: { path: string, alt: string }) => {
        const [url, setUrl] = useState<string | null>(null);

        useEffect(() => {
            const getUrl = async () => {
                const { data, error } = await supabase.storage.from('project_files').createSignedUrl(path, 60 * 60); // 1 hour expiry
                if (data) setUrl(data.signedUrl);
            };
            getUrl();
        }, [path]);

        if (!url) return <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400"><ImageIcon size={24} /></div>;

        return <Image src={url} alt={alt} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />;
    };


    if (loading) return <div className="py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading project photos...</div>;

    return (
        <div className="space-y-8">
            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><UploadCloud className="text-primary" /> Upload Project Photo</h2>
                <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Image <span className="text-red-500">*</span></label>
                        <input
                            type="file"
                            accept="image/*"
                            required
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                        <select value={uploadForm.photo_type} onChange={e => setUploadForm({ ...uploadForm, photo_type: e.target.value })} className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                            <option value="survey">Site Survey</option>
                            <option value="scope">Scope Defect / Issue</option>
                            <option value="checklist_proof">Checklist Proof</option>
                            <option value="general">General Progress</option>
                        </select>
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description (Optional)</label>
                        <input type="text" value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="What does this show?" />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                        <button type="submit" disabled={uploading || !uploadForm.file} className="w-full py-2 bg-primary text-white font-bold rounded hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center">
                            {uploading ? <Loader2 className="animate-spin" size={16} /> : "Upload"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Gallery Section */}
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Project Gallery</h2>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setFilterParams('all')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${filterParams === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All Photos</button>
                        <button onClick={() => setFilterParams('survey')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${filterParams === 'survey' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>Site Surveys</button>
                        <button onClick={() => setFilterParams('checklist_proof')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${filterParams === 'checklist_proof' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>Checklist Proofs</button>
                        <button onClick={() => setFilterParams('scope')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${filterParams === 'scope' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Issues/Scope</button>
                        <button onClick={() => setFilterParams('general')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${filterParams === 'general' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Generals</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPhotos.length === 0 ? (
                        <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                            No photos found for this category.
                        </div>
                    ) : (
                        filteredPhotos.map((photo) => (
                            <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group flex flex-col h-full">
                                <div className="aspect-video relative bg-gray-100 overflow-hidden">
                                    <SecureImage path={photo.photo_url} alt={photo.description || 'Project Photo'} />

                                    {(isManager || photo.uploaded_by === userId) && (
                                        <button
                                            onClick={() => handleDelete(photo.id, photo.photo_url)}
                                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10"
                                            title="Delete Photo"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}

                                    <div className="absolute bottom-2 left-2 flex gap-1 z-10">
                                        <span className="px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold uppercase rounded tracking-wider">
                                            {photo.photo_type.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-1 justify-between">
                                    {photo.description && <p className="text-sm font-medium text-gray-900 mb-3 line-clamp-2">{photo.description}</p>}
                                    <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                                        <div className="flex items-center gap-1"><User size={12} /> <span className="truncate max-w-[100px]">{photo.uploader?.full_name || 'Unknown'}</span></div>
                                        <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(photo.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
