"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [supabase] = useState(() => createClient());

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage("Check your email for a password reset link.");
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Or{" "}
                    <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                        return to sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleReset}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
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
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                            >
                                {loading ? "Sending link..." : "Send reset link"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
