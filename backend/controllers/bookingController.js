import ParkingLocation from '../models/ParkingLocation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Booking from '../models/Booking.js';
import crypto from 'crypto';

export const getNearbyParking = async (req, res) => {
  try {
    const locations = await ParkingLocation.find().lean();
    
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
