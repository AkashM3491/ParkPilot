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
