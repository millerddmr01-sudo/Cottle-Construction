import { CheckCircle2 } from "lucide-react";

export default function ServicesPage() {
    return (
        <div className="py-20 px-4 max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8 text-center">Our Services</h1>
            <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
                Specialized construction and repair services for commercial, municipal, and residential applications.
            </p>

            <div className="space-y-16">
                {/* Service 1 */}
                <section id="water-supply" className="bg-gray-50 rounded-2xl p-8 md:p-12 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-3xl font-bold text-primary mb-6">High-Pressure Water Supply Lines</h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-secondary">
                        <li className="flex items-start"><CheckCircle2 className="text-primary mr-3 shrink-0" /> <span>Installation and repair of high-pressure water supply lines</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-primary mr-3 shrink-0" /> <span>Fire hydrants and fire risers</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-primary mr-3 shrink-0" /> <span>Water main installation and repair</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-primary mr-3 shrink-0" /> <span>Culinary lines</span></li>
                    </ul>
                </section>

                {/* Service 2 */}
                <section id="excavation" className="bg-secondary text-white rounded-2xl p-8 md:p-12 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden border-l-8 border-primary">
                    <h2 className="text-3xl font-bold text-primary mb-6 relative z-10">Commercial Excavation</h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 text-gray-200">
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Sewer lines</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Foundations</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Footings</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Stormwater</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Evaporation pits</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Retention ponds</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Utilities</span></li>
                        <li className="flex items-start"><CheckCircle2 className="text-white mr-3 shrink-0" /> <span>Radiant heat supply lines</span></li>
                    </ul>
                </section>

                {/* Service 3 */}
                <section className="bg-gray-50 rounded-2xl p-8 md:p-12 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-3xl font-bold text-primary mb-6">Engineered Retaining Walls</h2>
                    <p className="text-gray-700 text-lg leading-relaxed flex items-start text-secondary">
                        <CheckCircle2 className="text-primary mr-3 shrink-0 mt-1" size={24} />
                        <span>Specialized design and construction of robust retaining walls built to exact engineering specifications to prevent soil erosion and manage challenging landscapes.</span>
                    </p>
                </section>

                {/* Service 4 */}
                <section id="specialized" className="bg-gray-50 rounded-2xl p-8 md:p-12 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-3xl font-bold text-primary mb-6">Hydro Excavating</h2>
                    <p className="text-gray-700 text-lg leading-relaxed flex items-start text-secondary">
                        <CheckCircle2 className="text-primary mr-3 shrink-0 mt-1" size={24} />
                        <span>Safe, non-destructive digging using pressurized water and a vacuum system to expose sensitive underground utilities without causing damage.</span>
                    </p>
                </section>
            </div>
        </div>
    );
}
