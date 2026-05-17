import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { MapPin, DollarSign, ListOrdered, Plus, Navigation, CarFront, Bike, Search } from 'lucide-react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';

const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem'
};
const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // Default to NYC

const FranchiseDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [locations, setLocations] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('active-bookings');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [price, setPrice] = useState('');
  const [slots, setSlots] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const handleMapClick = (e) => {
    setLat(e.latLng.lat().toFixed(6));
    setLng(e.latLng.lng().toFixed(6));
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLat = position.coords.latitude.toFixed(6);
          const currentLng = position.coords.longitude.toFixed(6);
          setLat(currentLat);
          setLng(currentLng);
          setMapCenter({ lat: Number(currentLat), lng: Number(currentLng) });
        },
        () => {
          alert("Could not fetch your location. Please ensure location permissions are enabled.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const fetchDashboard = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: statsData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/franchise/dashboard`, config);
      const { data: locData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/franchise/locations`, config);
      const { data: bookingsData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/franchise/bookings`, config);
      const { data: histData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/franchise/history`, config);
      setStats(statsData);
      setLocations(locData);
      setActiveBookings(bookingsData);
      setHistory(histData);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCompleteBooking = async (bookingId, extraFare, extraHours) => {
    if (extraFare > 0) {
      const confirmed = window.confirm(`⚠️ Vehicle Overstayed!\n\nPlease collect ₹${extraFare.toFixed(2)} extra for ${extraHours} extra hour(s).\n\nClick OK ONLY AFTER you have received the payment.`);
      if (!confirmed) return; // cancel checkout
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/franchise/bookings/${bookingId}/complete`, {}, config);
      setActiveBookings(activeBookings.filter(b => b._id !== bookingId));
      fetchDashboard(); // Refresh stats and history
      
      if (extraFare <= 0) {
        alert('Booking marked as completed and slot freed!');
      } else {
        alert('Extra payment recorded and slot freed successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error completing booking');
    }
  };

  useEffect(() => {
    if (user?.role === 'franchise') fetchDashboard();
  }, [user]);

  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/franchise/locations`, {
        name, address, lat: Number(lat), lng: Number(lng), price_per_hour: Number(price), total_slots: Number(slots), vehicle_type: vehicleType
      }, config);
      setShowAddForm(false);
      fetchDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding location');
    }
  };

  const filteredLocations = locations.filter(loc => 
    (loc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (loc.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActiveBookings = activeBookings.filter(booking => 
    (booking.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (booking.user_id?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (booking.location_id?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = history.filter(booking => 
    (booking.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (booking.user_id?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (booking.location_id?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCarSlots = locations.filter(loc => loc.vehicle_type === 'car').reduce((acc, curr) => acc + curr.total_slots, 0);
  const totalBikeSlots = locations.filter(loc => loc.vehicle_type === 'bike').reduce((acc, curr) => acc + curr.total_slots, 0);

  const activeCarBookings = activeBookings.filter(b => {
    const loc = locations.find(l => l._id === (b.location_id?._id || b.location_id));
    return loc?.vehicle_type === 'car';
  }).length;

  const activeBikeBookings = activeBookings.filter(b => {
    const loc = locations.find(l => l._id === (b.location_id?._id || b.location_id));
    return loc?.vehicle_type === 'bike';
  }).length;

  const availableCarSlots = totalCarSlots - activeCarBookings;
  const availableBikeSlots = totalBikeSlots - activeBikeBookings;

  if (!stats) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Franchise Dashboard</h1>
        {user.status === 'approved' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-md transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Location
          </button>
        )}
      </div>

      {user.status !== 'approved' && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-8" role="alert">
          <p className="font-bold">Account Pending</p>
          <p>Your account is waiting for admin approval. You cannot add locations until approved.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-12">
        <button onClick={() => setActiveTab('locations')} className={`block hover:-translate-y-1 transition-all w-full text-left ${activeTab === 'locations' ? 'ring-2 ring-primary rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<MapPin />} title="Locations" value={stats.totalLocations} />
        </button>
        <button onClick={() => setActiveTab('available-car-slots')} className={`block hover:-translate-y-1 transition-all w-full text-left ${activeTab === 'available-car-slots' ? 'ring-2 ring-primary rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<CarFront />} title="Avail. Car Slots" value={availableCarSlots} />
        </button>
        <button onClick={() => setActiveTab('available-bike-slots')} className={`block hover:-translate-y-1 transition-all w-full text-left ${activeTab === 'available-bike-slots' ? 'ring-2 ring-primary rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<Bike />} title="Avail. Bike Slots" value={availableBikeSlots} />
        </button>
        <button onClick={() => setActiveTab('active-bookings')} className={`block hover:-translate-y-1 transition-all w-full text-left ${activeTab === 'active-bookings' ? 'ring-2 ring-primary rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<CarFront />} title="Active Bookings" value={activeBookings.length} />
        </button>
        <button onClick={() => setActiveTab('history')} className={`block hover:-translate-y-1 transition-all w-full text-left ${activeTab === 'history' ? 'ring-2 ring-primary rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<ListOrdered />} title="Booking History" value={history.length} />
        </button>
        <div className="block w-full text-left cursor-default">
          <StatCard icon={<DollarSign />} title="Total Earnings" value={`₹${stats.earnings}`} />
        </div>
      </div>

      {activeTab === 'locations' && showAddForm && (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Add New Parking Location</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleAddLocation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location Name</label>
                <input type="text" required className="w-full border p-2 rounded focus:ring-primary focus:border-primary" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input type="text" required className="w-full border p-2 rounded focus:ring-primary focus:border-primary" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type</label>
                <div className="flex space-x-4">
                  <button type="button" onClick={() => setVehicleType('car')} className={`flex-1 flex items-center justify-center py-2 border rounded-lg transition-colors ${vehicleType === 'car' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-slate-300'}`}>
                    <CarFront className="w-5 h-5 mr-2" /> Car
                  </button>
                  <button type="button" onClick={() => setVehicleType('bike')} className={`flex-1 flex items-center justify-center py-2 border rounded-lg transition-colors ${vehicleType === 'bike' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-slate-300'}`}>
                    <Bike className="w-5 h-5 mr-2" /> Bike
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price Per Hour (₹)</label>
                  <input type="number" step="0.01" required className="w-full border p-2 rounded focus:ring-primary focus:border-primary" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Slots</label>
                  <input type="number" required className="w-full border p-2 rounded focus:ring-primary focus:border-primary" value={slots} onChange={e => setSlots(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                  <input type="number" step="any" readOnly placeholder="Click on map" required className="w-full border p-2 rounded bg-slate-50" value={lat} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                  <input type="number" step="any" readOnly placeholder="Click on map" required className="w-full border p-2 rounded bg-slate-50" value={lng} />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-white font-bold px-6 py-3 rounded hover:bg-blue-600 transition-colors mt-2">
                Save Location
              </button>
            </form>

            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Click on the map to set location pin</label>
                <button 
                  type="button" 
                  onClick={handleUseCurrentLocation}
                  className="text-xs flex items-center bg-blue-50 text-primary px-2 py-1 rounded hover:bg-blue-100 font-semibold transition-colors border border-blue-200"
                >
                  <Navigation className="w-3 h-3 mr-1" /> Use Current Location
                </button>
              </div>
              <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border border-slate-300 shadow-inner">
                {!isLoaded ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">Loading Map...</div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    zoom={12}
                    center={mapCenter}
                    onClick={handleMapClick}
                    options={{ disableDefaultUI: false }}
                  >
                    {lat && lng && <Marker position={{ lat: Number(lat), lng: Number(lng) }} />}
                  </GoogleMap>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'active-bookings' && (
      <div id="active-bookings" className="bg-white rounded-xl shadow-md overflow-hidden mb-8 scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Active Bookings</h2>
            <p className="text-sm text-slate-500">Manage cars currently parked in your slots</p>
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search active bookings..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredActiveBookings.map(booking => {
            const now = new Date();
            const endTime = new Date(booking.end_time);
            const isOverdue = now > endTime;
            const extraHours = isOverdue ? Math.ceil((now - endTime) / (1000 * 60 * 60)) : 0;
            const extraFare = isOverdue && booking.location_id?.price_per_hour ? extraHours * booking.location_id.price_per_hour : 0;

            return (
            <div key={booking._id} className="p-6 flex flex-col md:flex-row justify-between items-center bg-slate-50 hover:bg-white transition-colors">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg text-slate-900">{booking.vehicleNumber || 'Unknown Vehicle'}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold border border-blue-200">
                    Slot {booking.slot_id?.slot_number}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-semibold text-slate-800">{booking.user_id?.name}</span> • {booking.location_id?.name}
                </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center">
                  Ends: {endTime.toLocaleString()}
                </p>
                {isOverdue && (
                  <p className="text-sm font-bold text-red-600 mt-2 bg-red-50 inline-block px-2 py-1 rounded border border-red-200">
                    ⚠️ Overdue by {extraHours} hr(s) (+₹{extraFare.toFixed(2)})
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end">
                <p className="text-sm text-slate-500 font-medium">Original Paid</p>
                <p className="text-lg font-bold text-slate-800 mb-2">₹{booking.total_price.toFixed(2)}</p>
                <button 
                  onClick={() => handleCompleteBooking(booking._id, extraFare, extraHours)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors whitespace-nowrap"
                >
                  Checkout & Free Slot
                </button>
              </div>
            </div>
          )})}
          {filteredActiveBookings.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No active bookings found.
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'history' && (
      <div id="history" className="bg-white rounded-xl shadow-md overflow-hidden mb-8 scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Booking History</h2>
            <p className="text-sm text-slate-500">Recently completed bookings</p>
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredHistory.map(booking => (
            <div key={booking._id} className="p-6 flex flex-col md:flex-row justify-between items-center bg-slate-50 hover:bg-white transition-colors">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg text-slate-900">{booking.vehicleNumber || 'Unknown Vehicle'}</h3>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded font-bold">
                    Slot {booking.slot_id?.slot_number}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-semibold text-slate-800">{booking.user_id?.name}</span> • {booking.location_id?.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Completed on: {new Date(booking.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-sm text-slate-500 font-medium">Total Collected</p>
                <p className="text-lg font-bold text-slate-800">₹{booking.total_price.toFixed(2)}</p>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mt-1 border border-slate-200">Method: Secure Online</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mt-1 font-bold">Paid & Completed</span>
              </div>
            </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No past bookings found.
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'locations' && (
      <div id="locations" className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Your Locations</h2>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search locations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredLocations.map(loc => (
            <div key={loc._id} className="p-6 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  {loc.vehicle_type === 'bike' ? <Bike className="w-5 h-5 text-primary" /> : <CarFront className="w-5 h-5 text-primary" />}
                  <h3 className="font-semibold text-lg text-slate-900">{loc.name}</h3>
                </div>
                <p className="text-slate-500 text-sm ml-7">{loc.address}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">₹{loc.price_per_hour}/hr</p>
                <p className="text-sm text-slate-500">{loc.total_slots} Slots</p>
              </div>
            </div>
          ))}
          {filteredLocations.length === 0 && <div className="p-6 text-slate-500 text-center">No locations found.</div>}
        </div>
      </div>
      )}

      {(activeTab === 'available-car-slots' || activeTab === 'available-bike-slots') && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24 mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {activeTab === 'available-car-slots' ? 'Available Car Slots' : 'Available Bike Slots'}
              </h2>
              <p className="text-sm text-slate-500">View remaining capacity per location</p>
            </div>
            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Search locations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2" />
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {locations
              .filter(loc => loc.vehicle_type === (activeTab === 'available-car-slots' ? 'car' : 'bike'))
              .filter(loc => (loc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (loc.address || '').toLowerCase().includes(searchQuery.toLowerCase()))
              .map(loc => {
                const activeForLoc = activeBookings.filter(b => (b.location_id?._id || b.location_id) === loc._id).length;
                const remaining = loc.total_slots - activeForLoc;
                return (
                  <div key={loc._id} className="p-6 flex justify-between items-center bg-slate-50 hover:bg-white transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        {loc.vehicle_type === 'bike' ? <Bike className="w-5 h-5 text-primary" /> : <CarFront className="w-5 h-5 text-primary" />}
                        <h3 className="font-semibold text-lg text-slate-900">{loc.name}</h3>
                      </div>
                      <p className="text-slate-500 text-sm ml-7">{loc.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600">{remaining}</p>
                      <p className="text-sm text-slate-500 font-medium">Slots Available</p>
                      <p className="text-xs text-slate-400 mt-1">Out of {loc.total_slots} total</p>
                    </div>
                  </div>
                );
              })}
            {locations.filter(loc => loc.vehicle_type === (activeTab === 'available-car-slots' ? 'car' : 'bike')).length === 0 && (
              <div className="p-6 text-slate-500 text-center">No locations found for this vehicle type.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 flex items-center space-x-4">
    <div className="p-3 bg-blue-50 text-primary rounded-lg">
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

export default FranchiseDashboard;
