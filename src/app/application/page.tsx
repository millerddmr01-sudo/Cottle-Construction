import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

export default function ApplicationPage() {
    return (
        <div className="py-20 px-4 max-w-4xl mx-auto min-h-[60vh] flex flex-col justify-center items-center text-center">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 md:p-16 relative overflow-hidden w-full">
                <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>

                <div className="w-20 h-20 bg-gray-100 text-primary rounded-full flex items-center justify-center mx-auto mb-8">
                    <Clock size={40} />
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mb-6">Employment Application</h1>

                <div className="inline-block bg-primary/10 text-primary px-6 py-3 rounded-full font-bold text-lg mb-8">
                    Coming Soon
                </div>

                <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                    We are currently building our online application portal. Please check back later to apply for open positions.
                </p>

                <Link
                    href="/employment"
                    className="inline-flex items-center text-secondary hover:text-primary font-bold transition-colors"
                >
                    <ArrowLeft className="mr-2" size={20} /> Back to Employment Page
                </Link>
            </div>
        </div>
    );
}
