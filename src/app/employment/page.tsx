import { Briefcase, FileText, Mail } from "lucide-react";
import Link from "next/link";

export default function EmploymentPage() {
    return (
        <div className="py-20 px-4 max-w-4xl mx-auto min-h-[60vh] flex flex-col justify-center">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 md:p-16 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>

                <div className="w-20 h-20 bg-secondary text-primary rounded-full flex items-center justify-center mx-auto mb-8">
                    <Briefcase size={40} />
                </div>

                <h1 className="text-4xl font-extrabold text-secondary mb-6">Join Our Team</h1>

                <p className="text-xl text-gray-700 leading-relaxed mb-10 max-w-2xl mx-auto">
                    We are always looking for experienced, qualified, hard workers to add to our team. If you have what it takes to perform high-quality excavation and high-pressure water line work, we want to hear from you.
                </p>

                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 max-w-md mx-auto">
                    <h2 className="text-xl font-bold text-secondary mb-6 flex items-center justify-center">
                        <FileText className="mr-2 text-primary" /> How to Apply
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Click here to fill out an application.
                    </p>
                    <Link
                        href="/application"
                        className="w-full bg-primary text-secondary hover:bg-secondary hover:text-primary transition-colors font-bold px-6 py-4 rounded-md inline-flex justify-center items-center shadow-md"
                    >
                        <FileText className="mr-2" size={20} /> Employment Application
                    </Link>
                </div>
            </div>
        </div>
    );
}
