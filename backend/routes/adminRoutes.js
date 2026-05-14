import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getUsers,
  getFranchises,
  approveFranchise,
  getDashboardStats,
} from '../controllers/adminController.js';

const router = express.Router();

router.route('/users').get(protect, admin, getUsers);
router.route('/franchises').get(protect, admin, getFranchises);
router.route('/franchises/:id/approve').put(protect, admin, approveFranchise);
router.route('/dashboard').get(protect, admin, getDashboardStats);

export default router;
