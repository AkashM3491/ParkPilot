import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Clock, MapPin, QrCode, Navigation, CarFront, ListOrdered, DollarSign, Activity } from 'lucide-react';

const UserDashboard = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/parking/history`, config);
        // sort by newest first
        setBookings(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (error) {
        console.error(error);
      }
    };
    if (user?.role === 'user') fetchBookings();
  }, [user]);

  const currentBookings = bookings.filter(b => b.status === 'active');
  const pastBookings = bookings.filter(b => b.status !== 'active');

  const totalSpent = pastBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const totalActive = currentBookings.length;
  const totalCompleted = pastBookings.length;

  const renderBookingCard = (booking) => (
    <div key={booking._id} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col md:flex-row mb-6">
      <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{booking.location_id?.name || 'Unknown Location'}</h3>
            <p className="text-slate-500 flex items-center mt-1 text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              {booking.location_id?.address || 'N/A'}
            </p>
            {booking.location_id?.location && (
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${booking.location_id.location.lat},${booking.location_id.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-3 text-sm font-semibold text-primary hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
              >
                <Navigation className="w-4 h-4 mr-1.5" />
                Get Directions
              </a>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            booking.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
          }`}>
            {booking.status.toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex items-center space-x-2 text-slate-700">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Start</p>
              <p className="font-medium">{new Date(booking.start_time).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-700">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">End</p>
              <p className="font-medium">{new Date(booking.end_time).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-slate-700">
          <CarFront className="w-5 h-5 text-slate-400 mr-2" />
          <span className="text-sm font-semibold">Vehicle: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-primary">{booking.vehicleNumber || 'N/A'}</span></span>
        </div>
      </div>
      
      <div className="p-6 md:w-1/3 bg-slate-50 flex flex-col justify-center items-center">
        <div className="text-center mb-4">
          <p className="text-slate-500 text-sm font-semibold uppercase">Total Paid</p>
          <p className="text-3xl font-bold text-primary">₹{booking.total_price.toFixed(2)}</p>
        </div>
        {booking.status === 'active' && (
          <div className="mt-2 text-center">
            <div className="bg-white p-3 rounded-lg shadow-sm inline-block border border-slate-200">
              <QrCode className="w-16 h-16 text-slate-800 mx-auto" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Scan at entrance</p>
            <p className="text-[10px] font-mono text-slate-400 break-all w-32 mx-auto">{booking.QR_code}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Driver Dashboard</h1>
        <a href="/map" className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center">
          <MapPin className="w-5 h-5 mr-2" /> Find New Parking
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard icon={<Activity />} title="Active Parking" value={totalActive} color="text-blue-600" bg="bg-blue-100" />
        <StatCard icon={<ListOrdered />} title="Total Completed" value={totalCompleted} color="text-purple-600" bg="bg-purple-100" />
        <StatCard icon={<DollarSign />} title="Total Spent" value={`₹${totalSpent.toFixed(2)}`} color="text-green-600" bg="bg-green-100" />
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-200 pb-2">Current Bookings</h2>
        {currentBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-slate-200">
            <p className="text-slate-500">You have no active bookings right now.</p>
          </div>
        ) : (
          <div>{currentBookings.map(renderBookingCard)}</div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-200 pb-2">Recent Bookings</h2>
        {pastBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-slate-200">
            <p className="text-slate-500">You have no past bookings yet.</p>
          </div>
        ) : (
          <div>{pastBookings.map(renderBookingCard)}</div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color, bg }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 flex items-center space-x-4">
    <div className={`p-4 rounded-full ${bg} ${color}`}>
      {React.cloneElement(icon, { className: 'w-8 h-8' })}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

export default UserDashboard;
