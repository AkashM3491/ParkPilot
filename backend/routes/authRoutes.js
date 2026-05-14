import express from 'express';
import { registerUser, loginUser, googleAuth, upgradeToFranchise } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.put('/upgrade-franchise', protect, upgradeToFranchise);

export default router;
