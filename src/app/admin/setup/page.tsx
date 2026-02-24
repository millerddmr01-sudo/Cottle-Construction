"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminSetupPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch("/api/admin/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    fullName,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create admin");
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 py-12 px-4">
                <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-xl shadow-md border border-gray-100">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Admin Setup Complete</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please check your email to confirm your account.
                    </p>
                    <div className="mt-6">
                        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Create Initial Admin Account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 max-w">
                    This page should be disabled or deleted after setup.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <div className="mt-1">
                                <input
                                    type="text" required
                                    value={fullName} onChange={(e) => setFullName(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
                            <div className="mt-1">
                                <input
                                    type="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="mt-1">
                                <input
                                    type="password" required minLength={6}
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                />
                            </div>
                        </div>

                        {error && <div className="text-red-600 text-sm">{error}</div>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                            >
                                {loading ? "Creating..." : "Create Admin Setup"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
