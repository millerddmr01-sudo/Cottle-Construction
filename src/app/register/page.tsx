"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Type of account
    const [accountType, setAccountType] = useState<"customer" | "subcontractor">("customer");

    const [details, setDetails] = useState({
        fullName: "",
        companyName: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        phone: "",
        billingEmail: "",
        billingAddress: ""
    });

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleNext = () => {
        setError(null);
        if (step === 1) {
            if (!email || !password) {
                setError("Email and Password are required.");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const supabase = createClient();

        // Sign up the user. Metadata will be caught by a Supabase trigger to insert into user_profiles
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: accountType,
                    full_name: details.fullName,
                    company_name: details.companyName,
                    address: `${details.address}, ${details.city}, ${details.state} ${details.zip}`,
                    phone_number: details.phone,
                    billing_info: {
                        email: details.billingEmail || email,
                        address: details.billingAddress || `${details.address}, ${details.city}, ${details.state} ${details.zip}`
                    }
                }
            }
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-xl shadow-md border border-gray-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Registration Complete</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please check your email (<span className="font-bold">{email}</span>) for a confirmation link to activate your account.
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
            <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Step {step} of 2
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {/* STEP 1 */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">I am registering as a:</label>
                                    <div className="mt-2 grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setAccountType("customer")}
                                            className={`py-3 px-4 border rounded-md text-sm font-medium ${accountType === "customer" ? 'border-primary border-2 bg-primary/5 text-primary' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                                        >
                                            Customer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAccountType("subcontractor")}
                                            className={`py-3 px-4 border rounded-md text-sm font-medium ${accountType === "subcontractor" ? 'border-primary border-2 bg-primary/5 text-primary' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                                        >
                                            Subcontractor
                                        </button>
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                        <div className="mt-1">
                                            <input
                                                type="password" required
                                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && <div className="text-red-600 text-sm">{error}</div>}

                                <div className="flex justify-end gap-4 mt-6">
                                    <Link href="/login" className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                                        Cancel
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="py-2 px-6 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Profile Details</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                        <div className="mt-1">
                                            <input
                                                type="text" name="fullName" required
                                                value={details.fullName} onChange={handleDetailChange}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                        <div className="mt-1">
                                            <input
                                                type="text" name="companyName" required
                                                value={details.companyName} onChange={handleDetailChange}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                                    <div className="mt-1">
                                        <input
                                            type="text" name="address" required
                                            value={details.address} onChange={handleDetailChange}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">City</label>
                                        <div className="mt-1">
                                            <input
                                                type="text" name="city" required
                                                value={details.city} onChange={handleDetailChange}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">State</label>
                                        <div className="mt-1">
                                            <select
                                                name="state" required
                                                value={details.state} onChange={handleDetailChange}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black bg-white"
                                            >
                                                <option value="">Select</option>
                                                {US_STATES.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ZIP</label>
                                        <div className="mt-1">
                                            <input
                                                type="text" name="zip" required
                                                value={details.zip} onChange={handleDetailChange}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                    <div className="mt-1">
                                        <input
                                            type="tel" name="phone" required
                                            value={details.phone} onChange={handleDetailChange}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                        />
                                    </div>
                                </div>

                                <h3 className="text-lg font-medium text-gray-900 border-b pb-2 pt-4">Billing Information</h3>
                                <div className="text-sm text-gray-500 mb-4">Leave blank to use the same details provided above.</div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Billing Email <i>(Optional)</i></label>
                                        <div className="mt-1">
                                            <input
                                                type="email" name="billingEmail"
                                                value={details.billingEmail} onChange={handleDetailChange}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Billing Address <i>(Optional)</i></label>
                                        <div className="mt-1">
                                            <input
                                                type="text" name="billingAddress" placeholder="e.g. P.O. Box 123"
                                                value={details.billingAddress} onChange={handleDetailChange}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && <div className="text-red-600 text-sm">{error}</div>}

                                <div className="flex justify-between mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="py-2 px-8 border-2 border-primary rounded-md shadow-sm text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                                    >
                                        {loading ? "Creating Account..." : "Create Account"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
