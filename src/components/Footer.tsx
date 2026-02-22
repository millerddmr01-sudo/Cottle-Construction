import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-secondary text-white pt-12 pb-8 border-t-4 border-primary">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <h3 className="text-xl font-bold mb-4 text-primary">Cottle Construction</h3>
                    <p className="mb-4 text-gray-300">
                        Specialists in commercial excavation, high-pressure water supply lines, and engineered retaining walls.
                    </p>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4 text-primary">Quick Links</h3>
                    <ul className="space-y-2">
                        <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
                        <li><Link href="/portfolio" className="hover:text-primary transition-colors">Portfolio</Link></li>
                        <li><Link href="/employment" className="hover:text-primary transition-colors">Employment</Link></li>
                        <li><Link href="/contact-us" className="hover:text-primary transition-colors">Contact Us</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4 text-primary">Contact Us</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start">
                            <Mail className="mr-2 text-primary shrink-0" size={20} />
                            <a href="mailto:info@cottleconstruction.com" className="hover:text-primary transition-colors">info@cottleconstruction.com</a>
                        </li>
                        <li className="flex items-start">
                            <MapPin className="mr-2 text-primary shrink-0" size={20} />
                            <span>P. O. Box 774<br />Bountiful, UT 84010</span>
                        </li>
                        <li className="flex items-start">
                            <Phone className="mr-2 text-primary shrink-0" size={20} />
                            <a href="tel:801-821-7713" className="hover:text-primary transition-colors">801-821-7713</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="container mx-auto px-4 mt-8 pt-6 border-t border-gray-700 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Cottle Construction. All rights reserved.
            </div>
        </footer>
    );
}
