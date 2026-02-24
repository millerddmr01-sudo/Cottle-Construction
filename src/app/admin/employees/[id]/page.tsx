"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ChevronLeft, Save, UserCircle, HardHat, FileBadge, Upload, CheckCircle, XCircle, AlertTriangle, FileText, Trash2, Calendar } from "lucide-react";

export default function AdminEmployeeDetailPage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params.id as string;
    const supabase = createClient();

    const [employee, setEmployee] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);

    // Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({ document_type: "osha_10", notes: "", expiration_date: "", file: null as File | null });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editing Status State
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editDocStatus, setEditDocStatus] = useState<string>("pending");
    const [editDocExpiration, setEditDocExpiration] = useState<string>("");

    useEffect(() => {
        const fetchEmployeeData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login"); return;
            }

            const { data: adminCheck } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
            if (adminCheck?.role !== "admin") {
                router.push("/"); return;
            }

            // Fetch Profile
            const { data: profileData } = await supabase.from("user_profiles").select("*").eq("id", employeeId).single();
            if (!profileData) {
                router.push("/admin/employees"); return;
            }
            setEmployee(profileData);

            // Fetch Documents
            const { data: docData } = await supabase.from("employee_documents").select("*").eq("employee_id", employeeId).order("created_at", { ascending: false });
            setDocuments(docData || []);
            setLoading(false);
        };
        fetchEmployeeData();
    }, [router, supabase, employeeId]);


    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setEmployee({ ...employee, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        const { error } = await supabase.from("user_profiles").update({
            full_name: employee.full_name,
            phone_number: employee.phone_number,
            role: employee.role,
            employee_id: employee.employee_id,
            job_description: employee.job_description
        }).eq("id", employee.id);

        if (error) alert("Error saving profile: " + error.message);
        else alert("Profile updated successfully!");
        setSavingProfile(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadForm({ ...uploadForm, file: e.target.files[0] });
        }
    };

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.file) return;

        setUploading(true);
        const fileExt = uploadForm.file.name.split('.').pop();
        const fileName = `${employeeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage.from('employee_files').upload(fileName, uploadForm.file);

        if (uploadError) {
            alert("Error uploading file to storage: " + uploadError.message);
            setUploading(false); return;
        }

        // 2. Insert record
        const { data, error: dbError } = await supabase.from("employee_documents").insert({
            employee_id: employeeId,
            document_type: uploadForm.document_type,
            notes: uploadForm.notes,
            expiration_date: uploadForm.expiration_date || null,
            file_url: fileName,
            status: "approved" // Admins auto-approve their own uploads
        }).select().single();

        if (dbError) {
            alert("Error saving record: " + dbError.message);
        } else {
            setDocuments([data, ...documents]);
            setUploadForm({ document_type: "osha_10", notes: "", expiration_date: "", file: null });
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setUploading(false);
    };

    const handleDeleteDoc = async (id: string, fileUrl: string) => {
        if (!confirm("Are you sure you want to permanently delete this document?")) return;
        await supabase.storage.from('employee_files').remove([fileUrl]);
        const { error } = await supabase.from("employee_documents").delete().eq("id", id);
        if (!error) {
            setDocuments(documents.filter(d => d.id !== id));
        }
    };

    const handleUpdateDocStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDocId) return;

        const { error } = await supabase.from("employee_documents").update({
            status: editDocStatus,
            expiration_date: editDocExpiration || null
        }).eq("id", editingDocId);

        if (error) {
            alert("Error updating status: " + error.message);
        } else {
            const updatedDocs = documents.map(d => d.id === editingDocId ? { ...d, status: editDocStatus, expiration_date: editDocExpiration || null } : d);
            setDocuments(updatedDocs);
            setEditingDocId(null);
        }
    };

    const openDocUrl = async (path: string) => {
        const { data, error } = await supabase.storage.from('employee_files').createSignedUrl(path, 60 * 60);
        if (data) window.open(data.signedUrl, '_blank');
        else alert("Error opening file: " + error?.message);
    };

    if (loading) return <div className="p-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading profile...</div>;

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'approved': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200"><CheckCircle size={12} className="mr-1 inline" /> Valid & Approved</span>;
            case 'pending': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">Pending Review</span>;
            case 'submitted': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Awaiting Review</span>;
            case 'expired': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200"><AlertTriangle size={12} className="mr-1 inline" /> Expired</span>;
            case 'rejected': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200"><XCircle size={12} className="mr-1 inline" /> Rejected</span>;
            default: return <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">Unknown</span>;
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 pt-8 pb-20 px-4">
            <div className="container mx-auto max-w-6xl space-y-8">

                {/* Header */}
                <div>
                    <Link href="/admin/employees" className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-semibold mb-4 w-fit">
                        <ChevronLeft size={16} /> Back to Employee List
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {employee.role === 'foreman' ? <HardHat size={32} /> : <UserCircle size={32} />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-secondary mb-1">{employee.full_name || 'Unnamed User'}</h1>
                            <p className="text-gray-600 font-medium">{employee.email}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Col: Profile Editor */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Employment Details</h2>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                                    <input type="text" name="full_name" value={employee.full_name || ""} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                                    <input type="tel" name="phone_number" value={employee.phone_number || ""} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role Permission</label>
                                    <select name="role" value={employee.role} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
                                        <option value="employee">Standard Employee</option>
                                        <option value="foreman">Foreman</option>
                                        <option value="admin">Administrator (Warning)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Badge / Employee ID</label>
                                    <input type="text" name="employee_id" value={employee.employee_id || ""} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Job Title / Description</label>
                                    <input type="text" name="job_description" value={employee.job_description || ""} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>

                                <button type="submit" disabled={savingProfile} className="w-full py-2 bg-secondary text-white font-bold rounded hover:bg-secondary/90 disabled:opacity-50 mt-4 flex justify-center items-center gap-2">
                                    {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Profile Info
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Col: Certifications & Docs */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Upload Widget */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><FileBadge className="text-primary" /> Add Certification / Document</h2>
                            <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select File <span className="text-red-500">*</span></label>
                                        <input type="file" required ref={fileInputRef} onChange={handleFileSelect} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                    </div>
                                    <div className="w-full sm:w-1/3">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Document Type</label>
                                        <select value={uploadForm.document_type} onChange={e => setUploadForm({ ...uploadForm, document_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
                                            <option value="osha_10">OSHA 10</option>
                                            <option value="osha_30">OSHA 30</option>
                                            <option value="w4_form">W-4 Form</option>
                                            <option value="i9_form">I-9 Form</option>
                                            <option value="cpr_first_aid">CPR / First Aid</option>
                                            <option value="equipment_cert">Equipment Certification</option>
                                            <option value="direct_deposit">Direct Deposit Form</option>
                                            <option value="general">General / Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Expiration Date (If Applicable)</label>
                                    <input type="date" value={uploadForm.expiration_date} onChange={e => setUploadForm({ ...uploadForm, expiration_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" disabled={uploading || !uploadForm.file} className="w-full py-2 bg-primary text-white font-bold rounded hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center gap-2">
                                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Upload Document
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* List of compliance docs */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Compliance & Certifications</h2>
                                    <p className="text-sm text-gray-500 mt-1">Review licenses, safety proofs, and onboarding documents.</p>
                                </div>
                            </div>

                            {documents.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    No documents or certifications filed for this employee.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-900 uppercase tracking-wide text-sm">{doc.document_type.replace('_', ' ')}</span>
                                                        <StatusBadge status={doc.status} />
                                                    </div>

                                                    {doc.expiration_date && (
                                                        <div className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                                                            <Calendar size={12} /> Expires: {doc.expiration_date}
                                                            {new Date(doc.expiration_date) < new Date() && <span className="text-red-500 font-bold ml-2">(EXPIRED)</span>}
                                                        </div>
                                                    )}

                                                    <button onClick={() => openDocUrl(doc.file_url)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                                        View Document File
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Admin Actions for the DOC */}
                                            {editingDocId === doc.id ? (
                                                <form onSubmit={handleUpdateDocStatus} className="flex flex-col sm:flex-row items-end sm:items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-300 w-full md:w-auto">
                                                    <select value={editDocStatus} onChange={e => setEditDocStatus(e.target.value)} className="px-2 py-1 text-sm border-gray-300 rounded">
                                                        <option value="pending">Pending</option>
                                                        <option value="approved">Approved</option>
                                                        <option value="rejected">Rejected</option>
                                                        <option value="expired">Expired</option>
                                                    </select>
                                                    <input type="date" value={editDocExpiration} onChange={e => setEditDocExpiration(e.target.value)} className="px-2 py-1 text-sm border-gray-300 rounded max-w-[140px]" title="Expiration Date" />
                                                    <div className="flex gap-1 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <button type="button" onClick={() => setEditingDocId(null)} className="px-2 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded flex-1">Cancel</button>
                                                        <button type="submit" className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded flex-1">Save</button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="flex items-center gap-2 self-start w-full md:w-auto border-t md:border-none pt-3 md:pt-0 mt-2 md:mt-0 md:pl-4">
                                                    <button
                                                        onClick={() => { setEditingDocId(doc.id); setEditDocStatus(doc.status); setEditDocExpiration(doc.expiration_date || ""); }}
                                                        className="px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded text-xs font-bold shadow-sm"
                                                    >
                                                        Update Status
                                                    </button>
                                                    <button onClick={() => handleDeleteDoc(doc.id, doc.file_url)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
