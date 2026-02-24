"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        // Ensure user is authenticated by the magic link
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Your password reset session is invalid or has expired. Please request a new link.");
            }
        };
        checkSession();
    }, [supabase]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage("Your password was updated successfully!");
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Update your password
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleUpdatePassword}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm py-2">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="text-green-600 text-sm py-2 font-medium">
                                {message}
                                <div className="mt-2">
                                    <Link href="/login" className="text-primary hover:underline">Click here to log in</Link>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading || !!message}
                                className="w-full flex justify-center py-2 px-4 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Update password"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
