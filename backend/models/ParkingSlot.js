import mongoose from 'mongoose';

const parkingSlotSchema = mongoose.Schema(
  {
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ParkingLocation',
    },
    slot_number: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'reserved'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

const ParkingSlot = mongoose.model('ParkingSlot', parkingSlotSchema);
export default ParkingSlot;
