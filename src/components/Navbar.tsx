"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Menu, User, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        let isMounted = true;
        setMounted(true);

        const fetchUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    setUser(session?.user || null);
                    if (session?.user) {
                        const { data: profile } = await supabase
                            .from("user_profiles")
                            .select("role")
                            .eq("id", session.user.id)
                            .single();
                        setUserRole(profile?.role || null);
                    } else {
                        setUserRole(null);
                    }
                }
            } catch (err) {
                console.error("Error fetching session in Navbar:", err);
            }
        };

        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (isMounted) {
                    setUser(session?.user || null);
                    if (session?.user) {
                        const { data: profile } = await supabase
                            .from("user_profiles")
                            .select("role")
                            .eq("id", session.user.id)
                            .single();
                        setUserRole(profile?.role || null);
                    } else {
                        setUserRole(null);
                    }
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleLogout = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        // Optimistically clear UI state
        setUser(null);
        setUserRole(null);

        // Forcefully clear local storage immediately rather than waiting for server response
        if (typeof window !== 'undefined') {
            Object.keys(window.localStorage).forEach(key => {
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    window.localStorage.removeItem(key);
                }
            });
        }

        try {
            // Attempt standard signout, but use a timeout so it never hangs the UI
            await Promise.race([
                supabase.auth.signOut(),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
    };

    return (
        <header className="bg-white text-black sticky top-0 z-50 shadow-md">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/">
                    <Image
                        src="/HorizontalLogoLarge.png"
                        alt="Cottle Construction Logo"
                        width={250}
                        height={60}
                        className="h-12 w-auto object-contain"
                        priority
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex space-x-6 items-center">
                    <Link href="/services" className="hover:text-primary transition-colors font-semibold">Services</Link>
                    <Link href="/portfolio" className="hover:text-primary transition-colors font-semibold">Portfolio</Link>
                    <Link href="/employment" className="hover:text-primary transition-colors font-semibold">Employment</Link>
                    <Link href="/contact-us" className="bg-primary text-secondary px-4 py-2 rounded font-bold hover:bg-white transition-colors">Contact Us</Link>

                    {/* Hydration safe client rendering */}
                    {mounted ? (
                        user ? (
                            <div className="flex flex-row gap-4 items-center">
                                {(userRole === 'admin' || userRole === 'foreman' || userRole === 'employee') && (
                                    <Link href="/projects" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                                        Projects Dashboard
                                    </Link>
                                )}
                                {userRole === 'admin' && (
                                    <Link href="/admin" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                                        Admin Dashboard
                                    </Link>
                                )}
                                {userRole === 'subcontractor' && (
                                    <Link href="/subcontractor" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                                        Subcontractor Portal
                                    </Link>
                                )}
                                {userRole === 'customer' && (
                                    <Link href="/customer" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                                        Customer Portal
                                    </Link>
                                )}
                                <span className="flex items-center gap-2 text-sm text-gray-600 font-medium hidden lg:flex border-l border-gray-300 pl-4 ml-2">
                                    <User size={18} className="text-primary" />
                                    {user.email}
                                </span>
                                <button onClick={handleLogout} className="border-2 border-primary text-primary px-4 py-2 rounded font-bold hover:bg-primary hover:text-white transition-colors flex items-center gap-2 block bg-white">
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        ) : (
                            <Link href="/login" className="border-2 border-primary text-primary px-4 py-2 rounded font-bold hover:bg-primary hover:text-white transition-colors bg-white">Login</Link>
                        )
                    ) : (
                        <div className="w-[82px] h-[40px] border-2 border-transparent px-4 py-2 rounded"></div>
                    )}
                </nav>

                {/* Mobile Navigation Toggle (placeholder for future state logic) */}
                <button className="md:hidden text-black hover:text-primary">
                    <Menu size={28} />
                </button>
            </div>
        </header>
    );
}
