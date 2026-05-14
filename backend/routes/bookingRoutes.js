import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNearbyParking,
  getParkingDetails,
  createBooking,
  getMyBookings,
} from '../controllers/bookingController.js';

const router = express.Router();

router.route('/nearby').get(getNearbyParking); // Maybe public or protected based on requirement, let's keep it public
router.route('/history').get(protect, getMyBookings);
router.route('/:id').get(getParkingDetails);
router.route('/').post(protect, createBooking);

export default router;
