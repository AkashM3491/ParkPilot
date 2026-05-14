import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { MapPin, Clock, CreditCard, ShieldCheck } from 'lucide-react';

const Home = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-blue-600 to-indigo-800 text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1573413159938-23eb41743015?q=80&w=2000&auto=format&fit=crop')] mix-blend-overlay opacity-20 bg-cover bg-center"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Smart Parking, <span className="text-blue-200">Simplified.</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mb-10">
            Find, book, and pay for parking spots in real-time. Join our network as a driver or a franchise partner today.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            {(!user || user.role === 'user') ? (
              <>
                <Link to={user ? "/map" : "/login"} className="bg-white text-primary hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl card-hover">
                  Find a Spot Now
                </Link>
                <Link to={user ? "/become-partner" : "/login"} className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all card-hover">
                  Become a Partner
                </Link>
              </>
            ) : (
              <Link to={user.role === 'admin' ? '/admin' : '/franchise'} className="bg-white text-primary hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl card-hover">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Why Choose ParkPilot?</h2>
            <p className="mt-4 text-slate-600">The easiest way to manage your vehicle parking experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard icon={<MapPin />} title="Location-Based" description="Find the nearest available parking slots using real-time geolocation." />
            <FeatureCard icon={<Clock />} title="Dynamic Pricing" description="Pay only for the exact duration with our smart dynamic pricing system." />
            <FeatureCard icon={<CreditCard />} title="Instant Booking" description="Reserve your spot instantly to avoid the hassle of searching on arrival." />
            <FeatureCard icon={<ShieldCheck />} title="Secure Access" description="Get a unique QR code for seamless and secure entry to the parking facility." />
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 card-hover">
    <div className="w-12 h-12 bg-blue-100 text-primary rounded-xl flex items-center justify-center mb-4">
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600">{description}</p>
  </div>
);

export default Home;
