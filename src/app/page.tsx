import Image from "next/image";
import Link from "next/link";
import { Wrench, Pickaxe, MapPin, BadgeCheck, HardHat, Droplet } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden min-h-[600px] flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/holepipes1.jpg"
            alt="Construction Infrastructure"
            fill
            className="object-cover"
            priority
          />
          {/* Light gradient overlay to ensure text readability while seeing the image */}
          <div className="absolute inset-0 bg-secondary/40 bg-gradient-to-r from-secondary/50 to-secondary/10"></div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10 flex flex-col items-center text-center">
          <Image
            src="/HorizontalLogoLargeWhite.png"
            alt="Cottle Construction"
            width={600}
            height={150}
            className="mb-8 w-full max-w-[600px] h-auto"
            priority
          />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-white">
            Building Infrastructure<br /><span className="text-primary">You Can Depend On</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Specializing in high-pressure water supply lines, commercial excavation, and engineered solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/services" className="bg-primary text-secondary hover:bg-white transition-colors font-bold px-8 py-4 rounded-md text-lg inline-flex justify-center items-center">
              Our Services
            </Link>
            <Link href="/contact-us" className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-secondary transition-colors font-bold px-8 py-4 rounded-md text-lg inline-flex justify-center items-center">
              Get an Estimate
            </Link>
          </div>
        </div>
      </section>

      {/* Target Market & Niche */}
      <section className="bg-gradient-to-b from-gray-100 to-white py-16 px-4 border-b border-gray-200">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-2">Who We Are</h2>
              <h3 className="text-3xl md:text-4xl font-bold mb-6 text-secondary">The Repair Specialists</h3>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                We fill a critical niche in the construction and plumbing industries: <strong>repair work</strong>. Our projects are often too complex for standard plumbers, yet not large enough to attract massive excavation firms. We bring heavy-duty expertise to precise, demanding repair situations.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <BadgeCheck className="text-primary mr-3 mt-1 shrink-0" size={24} />
                  <div>
                    <strong className="text-secondary block font-bold mb-1">Our Target Markets Include:</strong>
                    <ul className="list-disc ml-5 text-gray-700 space-y-1">
                      <li>Fire Sprinkler Companies</li>
                      <li>Cities, Towns, and Federal Entities</li>
                      <li>Plumbing Companies Subcontracting Specialized Work</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-secondary rounded-xl p-8 text-white relative shadow-2xl overflow-hidden border-t-8 border-primary">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <HardHat size={120} />
              </div>
              <h3 className="text-2xl font-bold mb-4 relative z-10 text-primary">Why Choose Us?</h3>
              <p className="relative z-10 text-gray-300 leading-relaxed mb-6">
                When a high-pressure line bursts or a specialized excavation is needed instantly, you need a team that acts fast, knows the regulations, and has the equipment to dig safely and efficiently without massive overhauls.
              </p>
              <Link href="/portfolio" className="relative z-10 inline-flex items-center text-primary font-bold hover:text-white transition-colors group">
                View Our Work
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do / Services Summary */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-2">What We Do</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-secondary mb-4">Core Services</h3>
            <div className="w-24 h-1 bg-primary mx-auto rounded"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="relative rounded-xl border border-gray-100 hover:shadow-xl transition-shadow group flex flex-col h-full overflow-hidden min-h-[350px]">
              <div className="absolute inset-0 z-0">
                <Image src="/Hydrant.jpg" alt="High-Pressure Water Supply" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-secondary/50 group-hover:bg-secondary/40 transition-colors"></div>
              </div>
              <div className="relative z-10 p-8 flex flex-col h-full">
                <div className="w-14 h-14 bg-primary text-secondary rounded-lg flex items-center justify-center mb-6 group-hover:bg-white transition-colors">
                  <Droplet size={28} />
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">High-Pressure Water Supply</h4>
                <p className="text-gray-300 mb-6 flex-grow">
                  Installation and repair of high-pressure water supply lines, fire hydrants, fire risers, culinary lines, and water mains.
                </p>
                <Link href="/services#water-supply" className="text-primary font-bold hover:text-white transition-colors inline-block mt-auto text-sm uppercase tracking-wider">
                  Learn More &rarr;
                </Link>
              </div>
            </div>

            {/* Service 2 */}
            <div className="relative rounded-xl border border-gray-100 hover:shadow-xl transition-shadow group flex flex-col h-full overflow-hidden min-h-[350px]">
              <div className="absolute inset-0 z-0">
                <Image src="/Excavation3.jpg" alt="Commercial Excavation" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-secondary/50 group-hover:bg-secondary/40 transition-colors"></div>
              </div>
              <div className="relative z-10 p-8 flex flex-col h-full">
                <div className="w-14 h-14 bg-primary text-secondary rounded-lg flex items-center justify-center mb-6 group-hover:bg-white transition-colors">
                  <Pickaxe size={28} />
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">Commercial Excavation</h4>
                <p className="text-gray-300 mb-6 flex-grow">
                  Precision digging for sewer lines, foundations, footings, stormwater, holding systems, utilities, and radiant heat.
                </p>
                <Link href="/services#excavation" className="text-primary font-bold hover:text-white transition-colors inline-block mt-auto text-sm uppercase tracking-wider">
                  Learn More &rarr;
                </Link>
              </div>
            </div>

            {/* Service 3 */}
            <div className="relative rounded-xl border border-gray-100 hover:shadow-xl transition-shadow group flex flex-col h-full overflow-hidden min-h-[350px]">
              <div className="absolute inset-0 z-0">
                <Image src="/StreetHole1.jpg" alt="Specialized Solutions" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-secondary/50 group-hover:bg-secondary/40 transition-colors"></div>
              </div>
              <div className="relative z-10 p-8 flex flex-col h-full">
                <div className="w-14 h-14 bg-primary text-secondary rounded-lg flex items-center justify-center mb-6 group-hover:bg-white transition-colors">
                  <Wrench size={28} />
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">Specialized Solutions</h4>
                <p className="text-gray-300 mb-6 flex-grow">
                  Hydro excavating for sensitive utilities and construction of engineered retaining walls built to last.
                </p>
                <Link href="/services#specialized" className="text-primary font-bold hover:text-white transition-colors inline-block mt-auto text-sm uppercase tracking-wider">
                  Learn More &rarr;
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/services" className="bg-secondary text-white hover:bg-primary hover:text-secondary transition-colors font-bold px-8 py-4 rounded-md inline-block">
              View All Services Full Breakdown
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
