import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactUsPage() {
    return (
        <div className="py-20 px-4 max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mb-6 text-center">Contact Us</h1>
            <p className="text-xl text-gray-600 text-center mb-16 max-w-2xl mx-auto">
                Get in touch with us for estimates, questions, or specialized repair work.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-primary text-center hover:-translate-y-1 transition-transform">
                    <div className="w-16 h-16 bg-gray-100 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <Phone size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-secondary mb-4">Phone</h3>
                    <p className="text-gray-600 mb-2">Give us a call.</p>
                    <a href="tel:801-821-7713" className="text-lg font-bold text-primary hover:text-secondary transition-colors">801-821-7713</a>
                </div>

                <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-primary text-center hover:-translate-y-1 transition-transform">
                    <div className="w-16 h-16 bg-gray-100 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-secondary mb-4">Email</h3>
                    <p className="text-gray-600 mb-2">Send us a message.</p>
                    <a href="mailto:info@cottleconstruction.com" className="text-lg font-bold text-primary hover:text-secondary transition-colors break-all">info@cottleconstruction.com</a>
                </div>

                <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-primary text-center hover:-translate-y-1 transition-transform">
                    <div className="w-16 h-16 bg-gray-100 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <MapPin size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-secondary mb-4">Mailing Address</h3>
                    <p className="text-gray-600 mb-2">Reach us by mail.</p>
                    <address className="text-lg font-bold text-primary not-italic">
                        P. O. Box 774<br />
                        Bountiful, UT 84010
                    </address>
                </div>
            </div>
        </div>
    );
}
