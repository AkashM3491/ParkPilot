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
