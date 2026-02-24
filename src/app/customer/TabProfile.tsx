"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

export default function TabProfile({ userId, initialProfile, supabase }: { userId: string, initialProfile: any, supabase: any }) {
    const [profile, setProfile] = useState(initialProfile || {});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfile({
            ...profile,
            billing_info: {
                ...(profile.billing_info || {}),
                [e.target.name]: e.target.value
            }
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const { error } = await supabase
            .from("user_profiles")
            .update({
                full_name: profile.full_name,
                company_name: profile.company_name,
                phone_number: profile.phone_number,
                address: profile.address,
                billing_info: profile.billing_info
            })
            .eq("id", userId);

        if (error) {
            setMessage({ type: 'error', text: `Failed to save profile: ${error.message}` });
        } else {
            setMessage({ type: 'success', text: "Profile updated successfully!" });
        }
        setSaving(false);
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
            <p className="text-sm text-gray-500 mb-6">Keep your contact and billing information up to date.</p>

            <form onSubmit={handleSave} className="max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 border-b border-gray-200 pb-8">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text" name="full_name" value={profile.full_name || ""} onChange={handleChange} required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (Optional)</label>
                        <input
                            type="text" name="company_name" value={profile.company_name || ""} onChange={handleChange}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Login)</label>
                        <input
                            type="email" value={profile.email || ""} disabled
                            className="appearance-none block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm sm:text-sm text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">To change your email, please contact support.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="tel" name="phone_number" value={profile.phone_number || ""} onChange={handleChange}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                        <textarea
                            name="address" value={profile.address || ""} onChange={handleChange} rows={2}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-4">Billing Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Contact Name</label>
                        <input
                            type="text" name="contact_name" value={profile.billing_info?.contact_name || ""} onChange={handleBillingChange}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Email</label>
                        <input
                            type="email" name="email" value={profile.billing_info?.email || ""} onChange={handleBillingChange}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                        />
                    </div>
                </div>

                {message && (
                    <div className={`p-4 mb-6 rounded-md text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {saving ? "Saving..." : "Save Profile"}
                    </button>
                </div>
            </form>
        </div>
    );
}
