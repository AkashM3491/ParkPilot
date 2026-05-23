import mongoose from 'mongoose';

const parkingLocationSchema = mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    vehicle_type: {
      type: String,
      enum: ['car', 'bike'],
      default: 'car',
    },
    price_per_hour: {
      type: Number,
      required: true,
    },
    total_slots: {
      type: Number,
      required: true,
    },
    id_proof: {
      type: String, // Store base64 or path
      required: true,
    },
    user_photo: {
      type: String, // Store base64 or path
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const ParkingLocation = mongoose.model('ParkingLocation', parkingLocationSchema);
export default ParkingLocation;
