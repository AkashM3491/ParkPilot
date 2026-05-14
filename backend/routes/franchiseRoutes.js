import express from 'express';
import { protect, franchise } from '../middleware/authMiddleware.js';
import {
  addLocation,
  getMyLocations,
  getFranchiseDashboard,
  getFranchiseBookings,
  completeFranchiseBooking,
  getFranchiseHistory
} from '../controllers/franchiseController.js';

const router = express.Router();

router.route('/locations').post(protect, franchise, addLocation).get(protect, franchise, getMyLocations);
router.route('/dashboard').get(protect, franchise, getFranchiseDashboard);
router.route('/bookings').get(protect, franchise, getFranchiseBookings);
router.route('/history').get(protect, franchise, getFranchiseHistory);
router.route('/bookings/:id/complete').put(protect, franchise, completeFranchiseBooking);

export default router;
