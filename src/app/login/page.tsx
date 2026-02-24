"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        console.log("LOGIN -> User:", user?.id);

        if (user) {
            const { data: profile, error: profileError } = await supabase
                .from("user_profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            console.log("LOGIN -> Profile Data:", profile);
            console.log("LOGIN -> Profile Error:", profileError);

            if (profile?.role === "admin") {
                console.log("LOGIN -> Pushing to /admin");
                router.push("/admin");
            } else {
                console.log("LOGIN -> Not admin. Role is", profile?.role, "pushing to /");
                router.push("/");
            }
        } else {
            console.log("LOGIN -> No user. Pushing to /");
            router.push("/");
        }

        router.refresh();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Sign in to your account
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
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

                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <div className="text-sm">
                                    <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/80">
                                        Forgot your password?
                                    </Link>
                                </div>
                            </div>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm py-2">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                            >
                                {loading ? "Signing in..." : "Sign in"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">New to Cottle Construction?</span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <Link href="/register" className="font-medium text-primary hover:text-primary/80">
                                Create an account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
