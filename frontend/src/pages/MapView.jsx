import React, { useState, useEffect, useContext, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, DollarSign, Navigation, Search, CreditCard, ShieldCheck, Smartphone, CarFront, Bike } from 'lucide-react';

// Fix default Leaflet icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const parkingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedParkingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 47],
  iconAnchor: [15, 47],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Helper component to move map center
const MapCenterUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
};

const defaultCenter = [20.5937, 78.9629]; // Center of India

const MapView = () => {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [mapCenter, setMapCenter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Booking state
  const [hours, setHours] = useState(1);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState(new Date().toTimeString().substring(0, 5));
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => null
      );
    }

    const fetchLocations = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/parking/nearby`);
        setLocations(data);
      } catch (error) {
        console.error('Error fetching parking locations', error);
      }
    };
    fetchLocations();
  }, []);

  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc);
    setMapCenter([loc.location.lat, loc.location.lng]);
  };

  const handleInitiateBooking = () => {
    if (!user) { navigate('/login'); return; }
    if (!vehicleNumber.trim()) { alert('Please enter your Vehicle Registration Number to proceed.'); return; }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/parking/${selectedLocation._id}`);
      const availableSlot = data.slots.find(s => s.status === 'available');
      if (!availableSlot) {
        alert('Sorry, no slots available at this location right now.');
        return;
      }
      const startDateTime = new Date(`${bookingDate}T${bookingTime}`);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/parking`, {
        location_id: selectedLocation._id,
        slot_id: availableSlot._id,
        duration_hours: Number(hours),
        start_time: startDateTime.toISOString(),
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
      }, config);
      alert('Payment successful! Booking confirmed.');
      setShowPaymentModal(false);
      navigate('/dashboard');
    } catch (error) {
      alert(error.response?.data?.message || 'Error processing payment and booking');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || loc.vehicle_type === filterType || (!loc.vehicle_type && filterType === 'car');
    return matchesSearch && matchesType;
  });

  return (
    <div className="relative w-full h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white shadow-xl z-10 flex flex-col h-1/2 md:h-full overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <MapPin className="mr-2 text-primary" /> Find Parking
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-4">Select a marker on the map to book a slot.</p>

          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search locations or addresses..."
              className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button onClick={() => setFilterType('all')} className={`flex-1 py-1 text-sm font-semibold rounded-md transition-all ${filterType === 'all' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>All</button>
            <button onClick={() => setFilterType('car')} className={`flex-1 py-1 text-sm font-semibold rounded-md transition-all flex items-center justify-center ${filterType === 'car' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}><CarFront className="w-4 h-4 mr-1" />Car</button>
            <button onClick={() => setFilterType('bike')} className={`flex-1 py-1 text-sm font-semibold rounded-md transition-all flex items-center justify-center ${filterType === 'bike' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}><Bike className="w-4 h-4 mr-1" />Bike</button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {selectedLocation ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedLocation.name}</h3>
              <p className="text-slate-500 text-sm mb-4">{selectedLocation.address}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-slate-500 uppercase font-semibold">Price</p>
                  <p className="font-bold text-slate-800">₹{selectedLocation.price_per_hour}/hr</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <Navigation className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-slate-500 uppercase font-semibold">Available Slots</p>
                  <p className="font-bold text-slate-800">
                    <span className={selectedLocation.available_slots > 0 ? "text-green-600" : "text-red-600"}>{selectedLocation.available_slots !== undefined ? selectedLocation.available_slots : selectedLocation.total_slots}</span> / {selectedLocation.total_slots}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 border-t border-slate-200 pt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Duration: <span className="font-bold text-primary">{hours} hr</span></label>
                <input type="range" min="1" max="24" value={hours} onChange={e => setHours(e.target.value)} className="w-full accent-primary" />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Reg. Number</label>
                <input type="text" placeholder="e.g. MH-12-AB-1234" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary uppercase" required />
              </div>

              <div className="border-t border-slate-200 pt-4 mb-4 flex justify-between items-center">
                <span className="font-semibold text-slate-600">Total Price:</span>
                <span className="text-2xl font-bold text-primary">₹{(selectedLocation.price_per_hour * hours).toFixed(2)}</span>
              </div>

              <button onClick={handleInitiateBooking} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-blue-500/30">Book Now</button>
              <button onClick={() => setSelectedLocation(null)} className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl transition-all">Back to List</button>
            </div>
          ) : (
            <>
              {filteredLocations.map(loc => (
                <div key={loc._id} className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group" onClick={() => handleSelectLocation(loc)}>
                  <div className="flex items-center space-x-2 mb-1">
                    {(!loc.vehicle_type || loc.vehicle_type === 'car') ? <CarFront className="w-5 h-5 text-slate-400 group-hover:text-primary" /> : <Bike className="w-5 h-5 text-slate-400 group-hover:text-primary" />}
                    <h3 className="font-bold text-slate-800 group-hover:text-primary">{loc.name}</h3>
                  </div>
                  <p className="text-slate-500 text-sm truncate ml-7">{loc.address}</p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="font-bold text-primary">₹{loc.price_per_hour}/hr</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${loc.available_slots > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {loc.available_slots !== undefined ? `${loc.available_slots} Left` : `${loc.total_slots} slots`}
                    </span>
                  </div>
                </div>
              ))}
              {filteredLocations.length === 0 && (
                <div className="text-center p-8 text-slate-500">No parking locations match your search.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="w-full md:flex-grow h-1/2 md:h-full relative" style={{ zIndex: 0 }}>
        <MapContainer center={userLocation} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapCenter && <MapCenterUpdater center={mapCenter} />}

          {/* User location marker */}
          <Marker position={userLocation} icon={userIcon}>
            <Popup>📍 You are here</Popup>
          </Marker>

          {/* Parking markers */}
          {filteredLocations.map(loc => (
            <Marker
              key={loc._id}
              position={[loc.location.lat, loc.location.lng]}
              icon={selectedLocation?._id === loc._id ? selectedParkingIcon : parkingIcon}
              eventHandlers={{ click: () => handleSelectLocation(loc) }}
            >
              <Popup>
                <div className="p-1">
                  <p className="font-bold">{loc.name}</p>
                  <p className="text-sm text-gray-600">{loc.address}</p>
                  <p className={`text-sm font-semibold mt-1 ${loc.available_slots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{loc.price_per_hour}/hr · {loc.available_slots !== undefined ? `${loc.available_slots} slots left` : `${loc.total_slots} slots`}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center text-slate-800">
                <ShieldCheck className="w-6 h-6 mr-2 text-green-500" />Secure Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6">
              <div className="mb-6 bg-blue-50 rounded-xl p-4 flex justify-between items-center border border-blue-100">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-slate-800">₹{(selectedLocation.price_per_hour * hours).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-medium">Duration</p>
                  <p className="font-bold text-slate-800">{hours} hr</p>
                  <p className="text-xs text-slate-400">{bookingDate} at {bookingTime}</p>
                </div>
              </div>

              <div className="mb-6 flex bg-slate-100 p-1 rounded-lg">
                <button type="button" onClick={() => setPaymentMethod('card')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${paymentMethod === 'card' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>
                  <CreditCard className="w-4 h-4 mr-2" /> Credit Card
                </button>
                <button type="button" onClick={() => setPaymentMethod('upi')} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${paymentMethod === 'upi' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>
                  <Smartphone className="w-4 h-4 mr-2" /> UPI
                </button>
              </div>

              {paymentMethod === 'card' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Card Number</label>
                    <div className="relative">
                      <input type="text" placeholder="0000 0000 0000 0000" required className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" maxLength="19" />
                      <CreditCard className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                      <input type="text" placeholder="MM/YY" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" maxLength="5" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CVC</label>
                      <input type="password" placeholder="123" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" maxLength="3" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cardholder Name</label>
                    <input type="text" placeholder="John Doe" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enter your UPI ID</label>
                    <div className="relative">
                      <input type="text" placeholder="username@upi" required className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                      <Smartphone className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">A payment request will be sent to your UPI app.</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessingPayment}
                className={`w-full mt-8 text-white font-bold py-3 rounded-xl transition-all shadow-md ${isProcessingPayment ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 shadow-green-500/30'}`}
              >
                {isProcessingPayment ? 'Processing Payment...' : `Pay ₹${(selectedLocation.price_per_hour * hours).toFixed(2)} Now`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
