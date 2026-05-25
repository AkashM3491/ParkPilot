# CHAPTER 10: APPENDIX - CORE SOURCE CODE

The following section contains the raw, unedited source code for the core mathematical engines, security middleware, and React frontend components that power the ParkPilot ecosystem.

### File: `backend/server.js`

```javascript
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import franchiseRoutes from './routes/franchiseRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Allow all origins including Vercel frontend
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/franchise', franchiseRoutes);
app.use('/api/parking', bookingRoutes);

// Catch-all route to serve React index.html for unknown routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    next();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

```

### File: `backend/controllers/bookingController.js`

```javascript
import ParkingLocation from '../models/ParkingLocation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Booking from '../models/Booking.js';
import crypto from 'crypto';

export const getNearbyParking = async (req, res) => {
  try {
    const locations = await ParkingLocation.find({ status: 'approved' }).lean();
    
    const locationsWithSlots = await Promise.all(locations.map(async (loc) => {
      const available_slots = await ParkingSlot.countDocuments({ location_id: loc._id, status: 'available' });
      return { ...loc, available_slots };
    }));

    res.json(locationsWithSlots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getParkingDetails = async (req, res) => {
  try {
    const location = await ParkingLocation.findById(req.params.id);
    const slots = await ParkingSlot.find({ location_id: req.params.id });

    if (location) {
      res.json({ location, slots });
    } else {
      res.status(404).json({ message: 'Location not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { location_id, slot_id, duration_hours, start_time: reqStartTime, vehicleNumber } = req.body;

    const slot = await ParkingSlot.findById(slot_id);
    if (!slot || slot.status !== 'available') {
      return res.status(400).json({ message: 'Slot not available' });
    }

    const location = await ParkingLocation.findById(location_id);

    const total_price = location.price_per_hour * duration_hours;
    const start_time = reqStartTime ? new Date(reqStartTime) : new Date();
    const end_time = new Date(start_time.getTime() + duration_hours * 60 * 60 * 1000);

    const QR_code = crypto.randomBytes(16).toString('hex'); // Mock QR Code string

    const booking = await Booking.create({
      user_id: req.user._id,
      location_id,
      slot_id,
      start_time,
      end_time,
      total_price,
      QR_code,
      vehicleNumber: vehicleNumber || 'Unknown',
    });

    // Update slot status
    slot.status = 'booked';
    await slot.save();

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user_id: req.user._id }).populate('location_id').populate('slot_id');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

```

### File: `backend/controllers/authController.js`

```javascript
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, aadharNumber, panNumber, franchiseLocation } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      status: role === 'franchise' ? 'pending' : 'approved',
      aadharNumber,
      panNumber,
      franchiseLocation,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;
    
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    });
    
    const { name, email } = ticket.getPayload();
    
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        name,
        email,
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // random secure password
        role: role || 'user',
        status: role === 'franchise' ? 'pending' : 'approved',
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      token: generateToken(user._id),
    });
    
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Google Authentication failed' });
  }
};

export const upgradeToFranchise = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const { aadharNumber, panNumber, franchiseLocation } = req.body;
    
    user.role = 'franchise';
    user.status = 'pending';
    user.aadharNumber = aadharNumber;
    user.panNumber = panNumber;
    user.franchiseLocation = franchiseLocation;
    
    await user.save();
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.name = req.body.name || user.name;
    if (req.body.profilePic !== undefined) {
      user.profilePic = req.body.profilePic;
    }

    await user.save();
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profilePic: user.profilePic,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

```

### File: `backend/middleware/authMiddleware.js`

```javascript
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

export const franchise = (req, res, next) => {
  if (req.user && (req.user.role === 'franchise' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a franchise owner' });
  }
};

```

### File: `backend/models/Booking.js`

```javascript
import mongoose from 'mongoose';

const bookingSchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    slot_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ParkingSlot',
    },
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ParkingLocation',
    },
    start_time: {
      type: Date,
      required: true,
    },
    end_time: {
      type: Date,
      required: true,
    },
    total_price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    QR_code: {
      type: String,
      required: false,
    },
    vehicleNumber: {
      type: String,
      required: true,
      default: 'Unknown',
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;

```

### File: `frontend/src/context/AuthContext.jsx`

```javascript
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('userInfo');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (name, email, password, role, extraData = {}) => {
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, { name, email, password, role, ...extraData });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const googleLogin = async (credential, role = 'user') => {
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/google`, { credential, role });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Google Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  const upgradeFranchise = async (franchiseData) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/upgrade-franchise`, franchiseData, config);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response && error.response.data.message ? error.response.data.message : error.message,
      };
    }
  };

  const updateUserProfile = async (profileData) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, profileData, config);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Profile update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, logout, upgradeFranchise, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

```

### File: `frontend/src/pages/MapView.jsx`

```javascript
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

```

### File: `frontend/src/pages/FranchiseDashboard.jsx`

```javascript
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
  const [idProof, setIdProof] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);

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

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!idProof || !userPhoto) {
      alert("Please upload both ID Proof and User Photo.");
      return;
    }

    const confirmSubmit = window.confirm("Are you sure you want to submit this new location? It will be placed under 'Pending Approval' until an admin reviews your documents. You cannot receive bookings for this location until it is approved.");
    if (!confirmSubmit) return;

    try {
      const idProofBase64 = await fileToBase64(idProof);
      const userPhotoBase64 = await fileToBase64(userPhoto);

      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/franchise/locations`, {
        name, address, lat: Number(lat), lng: Number(lng), price_per_hour: Number(price), total_slots: Number(slots), vehicle_type: vehicleType,
        id_proof: idProofBase64,
        user_photo: userPhotoBase64
      }, config);
      setShowAddForm(false);
      fetchDashboard();
      
      // Reset form
      setName('');
      setAddress('');
      setLat('');
      setLng('');
      setPrice('');
      setSlots('');
      setIdProof(null);
      setUserPhoto(null);
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
        {activeTab === 'locations' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-md transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Location
          </button>
        )}
      </div>

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
          <h2 className="text-xl font-bold mb-2">Add New Parking Location</h2>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-6 rounded text-sm font-medium">
            ⚠️ Note: Every new location must be approved by an Admin. It will be marked as "Pending Approval" and will not be visible to users until your Aadhar/PAN and Photo are verified.
          </div>
          
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar or PAN Proof</label>
                  <input type="file" accept="image/*,.pdf" required className="w-full border p-1 rounded focus:ring-primary focus:border-primary" onChange={e => setIdProof(e.target.files[0])} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Franchise User Photo</label>
                  <input type="file" accept="image/*" required className="w-full border p-1 rounded focus:ring-primary focus:border-primary" onChange={e => setUserPhoto(e.target.files[0])} />
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
                  {loc.status === 'pending' && <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">Pending Approval</span>}
                  {loc.status === 'approved' && <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Approved</span>}
                  {loc.status === 'rejected' && <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">Rejected</span>}
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

```

### File: `frontend/src/pages/AdminDashboard.jsx`

```javascript
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Users, Building2, MapPin, CreditCard, Search } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [franchises, setFranchises] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [locations, setLocations] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [activeTab, setActiveTab] = useState('franchises');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data: statsData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`, config);
        const { data: franchisesData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/franchises`, config);
        const { data: usersData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, config);
        const { data: locData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/locations`, config);
        const { data: revData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/revenue`, config);
        
        setStats(statsData);
        setFranchises(franchisesData);
        setUsersList(usersData);
        setLocations(locData);
        setRevenue(revData);
      } catch (error) {
        console.error('Error fetching admin data', error);
        setError('Failed to load admin data or access denied.');
      }
    };
    
    if (user && user.role === 'admin') {
      fetchAdminData();
    } else if (user && user.role !== 'admin') {
      setError('Access Denied: You must be an admin to view this page.');
    }
  }, [user]);

  const handleApprove = async (id, status) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/franchises/${id}/approve`, { status }, config);
      setFranchises(franchises.map(f => f._id === id ? { ...f, status } : f));
    } catch (error) {
      console.error('Error updating status', error);
      alert('Failed to update status');
    }
  };

  const filteredFranchises = franchises.filter(f => 
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.aadharNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.panNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.franchiseLocation || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) return <div className="p-8 text-center text-xl text-red-600 font-bold">{error}</div>;
  if (!stats) return <div className="p-8 text-center text-xl">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <button onClick={() => setActiveTab('users')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'users' ? 'ring-2 ring-blue-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<Users />} title="Total Users" value={stats.totalUsers} color="text-blue-600" bg="bg-blue-100" />
        </button>
        <button onClick={() => setActiveTab('franchises')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'franchises' ? 'ring-2 ring-purple-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<Building2 />} title="Franchises" value={stats.totalFranchises} color="text-purple-600" bg="bg-purple-100" />
        </button>
        <button onClick={() => setActiveTab('locations')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'locations' ? 'ring-2 ring-orange-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<MapPin />} title="Locations" value={stats.totalLocations} color="text-orange-600" bg="bg-orange-100" />
        </button>
        <button onClick={() => setActiveTab('revenue')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'revenue' ? 'ring-2 ring-green-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<CreditCard />} title="Revenue" value={`₹${stats.totalRevenue}`} color="text-green-600" bg="bg-green-100" />
        </button>
      </div>

      {activeTab === 'franchises' && (
      <div id="franchises" className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Franchise Approvals</h2>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search franchises..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredFranchises.length === 0 ? (
            <div className="p-6 text-slate-500 text-center">No franchises found.</div>
          ) : (
            filteredFranchises.map(franchise => (
              <div key={franchise._id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 w-full">
                  <h3 className="font-bold text-xl text-slate-900">{franchise.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{franchise.email}</p>
                  
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="font-bold text-slate-500 block text-xs uppercase mb-1">Aadhar Number</span>
                      <span className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded">{franchise.aadharNumber || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block text-xs uppercase mb-1">PAN Number</span>
                      <span className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded uppercase">{franchise.panNumber || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block text-xs uppercase mb-1">Proposed Location</span>
                      <span className="text-slate-900">{franchise.franchiseLocation || 'Not provided'}</span>
                    </div>
                  </div>

                  <span className={`inline-block mt-4 px-3 py-1 text-xs font-bold rounded border ${franchise.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : franchise.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                    Status: {franchise.status.toUpperCase()}
                  </span>
                </div>
                {franchise.status === 'pending' && (
                  <div className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-2 w-full md:w-auto mt-4 md:mt-0">
                    <button onClick={() => handleApprove(franchise._id, 'approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all">Approve</button>
                    <button onClick={() => handleApprove(franchise._id, 'rejected')} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all">Reject</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {activeTab === 'users' && (
      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Franchise Users</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {franchises.length === 0 ? (
              <div className="p-6 text-slate-500 text-center">No franchise users found.</div>
            ) : (
              franchises.map(u => (
                <div key={u._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{u.name}</h3>
                    <p className="text-slate-500 text-sm">{u.email}</p>
                  </div>
                  <div className="flex items-center space-x-2 mt-4 md:mt-0">
                    <div className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-bold">
                      FRANCHISE
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full font-bold ${
                      u.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      u.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {u.status ? u.status.toUpperCase() : 'PENDING'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Customer Users</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {usersList.length === 0 ? (
              <div className="p-6 text-slate-500 text-center">No customers found.</div>
            ) : (
              usersList.map(u => (
                <div key={u._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{u.name}</h3>
                    <p className="text-slate-500 text-sm">{u.email}</p>
                  </div>
                  <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold">
                    CUSTOMER
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'locations' && (
      <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">All Parking Locations</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {locations.length === 0 ? (
            <div className="p-6 text-slate-500 text-center">No locations found.</div>
          ) : (
            locations.map(loc => (
              <div key={loc._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{loc.name} <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded ml-2 uppercase">{loc.vehicle_type}</span></h3>
                  <p className="text-slate-500 text-sm">{loc.address}</p>
                  <p className="text-xs text-slate-400 mt-1">Owned by: {loc.owner_id?.name || 'Unknown'} ({loc.owner_id?.email || 'N/A'})</p>
                </div>
                <div className="text-right mt-4 md:mt-0">
                  <p className="text-lg font-bold text-primary">₹{loc.price_per_hour}/hr</p>
                  <p className="text-sm text-slate-500 font-medium">{loc.total_slots} Total Slots</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {activeTab === 'revenue' && (
      <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Revenue by Franchise</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {revenue.length === 0 ? (
            <div className="p-6 text-slate-500 text-center">No revenue data found.</div>
          ) : (
            revenue.map(rev => (
              <div key={rev._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{rev.name}</h3>
                  <p className="text-slate-500 text-sm">{rev.email}</p>
                </div>
                <div className="text-right mt-4 md:mt-0">
                  <p className="text-sm text-slate-500 font-medium">Total Generated</p>
                  <p className="text-2xl font-bold text-green-600">₹{rev.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, color, bg }) => (
  <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
    <div className={`p-4 rounded-full ${bg} ${color}`}>
      {React.cloneElement(icon, { className: 'w-8 h-8' })}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

export default AdminDashboard;

```

