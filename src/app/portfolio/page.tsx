import { Camera } from "lucide-react";
import Image from "next/image";

export default function PortfolioPage() {
    return (
        <div className="py-20 px-4 max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 text-center">Our Portfolio</h1>
            <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
                A gallery of our recent projects showcasing our expertise in repair work, high-pressure lines, and excavation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Placeholder for Job 1 */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 group">
                    <div className="h-64 relative bg-gray-200 group-hover:opacity-90 transition-opacity">
                        <Image src="/holepipes1.jpg" alt="Fire Main Repair" fill className="object-cover" />
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-secondary mb-2">Fire Main Repair</h3>
                        <p className="text-gray-600">Emergency repair of a 12-inch high-pressure fire main line for a major commercial facility.</p>
                    </div>
                </div>

                {/* Placeholder for Job 2 */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 group">
                    <div className="h-64 relative bg-gray-200 group-hover:opacity-90 transition-opacity">
                        <Image src="/Hydro1.jpg" alt="Hydro Excavation" fill className="object-cover" />
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-secondary mb-2">Hydro Excavation</h3>
                        <p className="text-gray-600">Precision hydro excavating around sensitive fiber optic networks to install new water utilities.</p>
                    </div>
                </div>

                {/* Placeholder for Job 3 */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 group">
                    <div className="h-64 relative bg-gray-200 group-hover:opacity-90 transition-opacity">
                        <Image src="/Wall1.jpg" alt="Engineered Retaining Wall" fill className="object-cover" />
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-secondary mb-2">Engineered Retaining Wall</h3>
                        <p className="text-gray-600">Construction of a 15-foot tiered retaining wall to stabilize a commercial hillside development.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
