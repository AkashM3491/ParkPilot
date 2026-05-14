# Smart Vehicle Parking Slot Booking System

A full-stack web application that allows users to find and book parking slots nearby with dynamic pricing, and enables franchise partners to list their parking spaces.

## Features

- **Users (Drivers)**: Find nearby parking, view distance/price, book slots instantly, view history with QR codes.
- **Franchise Partners**: List parking locations, manage slots, view earnings and bookings.
- **Admin**: Approve franchises, view platform-wide statistics.
- **Location-based**: Google Maps integration for easy discovery.

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite, `@react-google-maps/api`, `lucide-react`
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT Authentication
- **Design**: Modern UI with Glassmorphism and vibrant color schemes.

## Setup Instructions

### 1. Prerequisites
- Node.js installed
- MongoDB running locally or a MongoDB Atlas URI

### 2. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create/Check the `.env` file with the following:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/smart_parking
   JWT_SECRET=supersecretjwtkey123
   NODE_ENV=development
   ```
3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Set your Google Maps API Key in a `.env` file (optional, uses dummy key by default):
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_real_key_here
   ```
3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

### 4. Sample Flow
- Register a new user as an Admin (You can change role in DB manually to `admin`).
- Register a Franchise Owner (Status will be pending).
- Admin logs in and approves Franchise.
- Franchise logs in and adds a Parking Location (Slots are generated automatically).
- User registers/logs in, goes to Map, clicks a marker, and books a slot!
