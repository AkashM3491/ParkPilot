import express from 'express';
import { registerUser, loginUser, googleAuth, upgradeToFranchise, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.put('/upgrade-franchise', protect, upgradeToFranchise);
router.put('/profile', protect, updateProfile);

export default router;
