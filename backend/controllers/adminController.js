import User from '../models/User.js';
import ParkingLocation from '../models/ParkingLocation.js';
import Booking from '../models/Booking.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFranchises = async (req, res) => {
  try {
    const franchises = await User.find({ role: 'franchise' }).select('-password');
    res.json(franchises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveFranchise = async (req, res) => {
  try {
    const franchiseId = req.params.id;
    const { status } = req.body; // 'approved' or 'rejected'

    const franchise = await User.findById(franchiseId);

    if (franchise && franchise.role === 'franchise') {
      franchise.status = status;
      await franchise.save();
      res.json({ message: `Franchise ${status} successfully` });
    } else {
      res.status(404).json({ message: 'Franchise not found' });
    }
  } catch (error) {
    console.error('Error in approveFranchise:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalFranchises = await User.countDocuments({ role: 'franchise' });
    const totalLocations = await ParkingLocation.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // calculate total revenue
    const bookings = await Booking.find({ status: 'completed' });
    const totalRevenue = bookings.reduce((acc, curr) => acc + curr.total_price, 0);

    res.json({
      totalUsers,
      totalFranchises,
      totalLocations,
      totalBookings,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find().populate('owner_id', 'name email');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFranchiseRevenue = async (req, res) => {
  try {
    const franchises = await User.find({ role: 'franchise' });
    const bookings = await Booking.find({ status: 'completed' }).populate('location_id');
    
    const revenueData = franchises.map(franchise => {
      // Find all bookings for locations owned by this franchise
      const franchiseBookings = bookings.filter(b => 
        b.location_id && String(b.location_id.owner_id) === String(franchise._id)
      );
      
      const totalRevenue = franchiseBookings.reduce((sum, b) => sum + b.total_price, 0);
      return {
        _id: franchise._id,
        name: franchise.name,
        email: franchise.email,
        totalRevenue
      };
    });
    
    // Sort by highest revenue
    revenueData.sort((a, b) => b.totalRevenue - a.totalRevenue);
    res.json(revenueData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
