import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';

export default function Navbar() {
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
                </nav>

                {/* Mobile Navigation Toggle (placeholder for future state logic) */}
                <button className="md:hidden text-black hover:text-primary">
                    <Menu size={28} />
                </button>
            </div>
        </header>
    );
}
