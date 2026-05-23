import ParkingLocation from '../models/ParkingLocation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Booking from '../models/Booking.js';

export const addLocation = async (req, res) => {
  try {
    const { name, address, lat, lng, price_per_hour, total_slots, vehicle_type, id_proof, user_photo } = req.body;

    const location = await ParkingLocation.create({
      owner_id: req.user._id,
      name,
      address,
      location: { lat, lng },
      vehicle_type: vehicle_type || 'car',
      price_per_hour,
      total_slots,
      id_proof,
      user_photo
    });

    // Automatically create slots
    const slotsToCreate = [];
    for (let i = 1; i <= total_slots; i++) {
      slotsToCreate.push({
        location_id: location._id,
        slot_number: `A-${i}`,
        status: 'available',
      });
    }
    await ParkingSlot.insertMany(slotsToCreate);

    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find({ owner_id: req.user._id });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFranchiseDashboard = async (req, res) => {
  try {
    const locations = await ParkingLocation.find({ owner_id: req.user._id });
    const locationIds = locations.map(loc => loc._id);

    const totalSlots = locations.reduce((acc, curr) => acc + curr.total_slots, 0);
    const bookings = await Booking.find({ location_id: { $in: locationIds } });

    const totalBookings = bookings.length;
    const earnings = bookings.filter(b => b.status === 'completed').reduce((acc, curr) => acc + curr.total_price, 0);

    res.json({
      totalLocations: locations.length,
      totalSlots,
      totalBookings,
      earnings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFranchiseBookings = async (req, res) => {
  try {
    const locations = await ParkingLocation.find({ owner_id: req.user._id });
    const locationIds = locations.map(loc => loc._id);

    const activeBookings = await Booking.find({ 
      location_id: { $in: locationIds },
      status: 'active'
    })
    .populate('user_id', 'name email')
    .populate('location_id', 'name price_per_hour')
    .populate('slot_id', 'slot_number')
    .sort({ start_time: -1 });

    res.json(activeBookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const completeFranchiseBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const location = await ParkingLocation.findById(booking.location_id);
    
    const now = new Date();
    const endTime = new Date(booking.end_time);
    let extraFare = 0;
    let extraHours = 0;
    
    if (now > endTime) {
      extraHours = Math.ceil((now - endTime) / (1000 * 60 * 60));
      extraFare = extraHours * (location.price_per_hour || 0);
      booking.total_price += extraFare;
    }

    booking.status = 'completed';
    await booking.save();

    const slot = await ParkingSlot.findById(booking.slot_id);
    if (slot) {
      slot.status = 'available';
      await slot.save();
    }

    res.json({ 
      message: 'Booking completed and slot freed', 
      extraFare, 
      extraHours 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFranchiseHistory = async (req, res) => {
  try {
    const locations = await ParkingLocation.find({ owner_id: req.user._id });
    const locationIds = locations.map(loc => loc._id);

    const pastBookings = await Booking.find({ 
      location_id: { $in: locationIds },
      status: 'completed'
    })
    .populate('user_id', 'name email')
    .populate('location_id', 'name price_per_hour')
    .populate('slot_id', 'slot_number')
    .sort({ updatedAt: -1 })
    .limit(50);

    res.json(pastBookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
