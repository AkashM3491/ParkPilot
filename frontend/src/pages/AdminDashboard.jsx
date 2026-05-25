import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Users, Building2, MapPin, CreditCard, Search } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [franchises, setFranchises] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [locations, setLocations] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [activeTab, setActiveTab] = useState('franchises');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data: statsData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`, config);
        const { data: franchisesData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/franchises`, config);
        const { data: usersData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, config);
        const { data: locData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/locations`, config);
        const { data: revData } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/revenue`, config);
        
        setStats(statsData);
        setFranchises(franchisesData);
        setUsersList(usersData);
        setLocations(locData);
        setRevenue(revData);
      } catch (error) {
        console.error('Error fetching admin data', error);
        setError('Failed to load admin data or access denied.');
      }
    };
    
    if (user && user.role === 'admin') {
      fetchAdminData();
    } else if (user && user.role !== 'admin') {
      setError('Access Denied: You must be an admin to view this page.');
    }
  }, [user]);

  const handleApprove = async (id, status) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/franchises/${id}/approve`, { status }, config);
      setFranchises(franchises.map(f => f._id === id ? { ...f, status } : f));
    } catch (error) {
      console.error('Error updating status', error);
      alert('Failed to update status');
    }
  };

  const handleApproveLocation = async (id, status) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/locations/${id}/status`, { status }, config);
      setLocations(locations.map(loc => loc._id === id ? { ...loc, status } : loc));
    } catch (error) {
      console.error('Error updating location status', error);
      alert('Failed to update location status');
    }
  };

  const filteredFranchises = franchises.filter(f => 
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.aadharNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.panNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.franchiseLocation || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) return <div className="p-8 text-center text-xl text-red-600 font-bold">{error}</div>;
  if (!stats) return <div className="p-8 text-center text-xl">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <button onClick={() => setActiveTab('users')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'users' ? 'ring-2 ring-blue-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<Users />} title="Total Users" value={stats.totalUsers} color="text-blue-600" bg="bg-blue-100" />
        </button>
        <button onClick={() => setActiveTab('franchises')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'franchises' ? 'ring-2 ring-purple-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<Building2 />} title="Franchises" value={stats.totalFranchises} color="text-purple-600" bg="bg-purple-100" />
        </button>
        <button onClick={() => setActiveTab('locations')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'locations' ? 'ring-2 ring-orange-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<MapPin />} title="Locations" value={stats.totalLocations} color="text-orange-600" bg="bg-orange-100" />
        </button>
        <button onClick={() => setActiveTab('revenue')} className={`block hover:-translate-y-1 transition-transform w-full text-left ${activeTab === 'revenue' ? 'ring-2 ring-green-600 rounded-xl shadow-lg scale-105' : ''}`}>
          <StatCard icon={<CreditCard />} title="Revenue" value={`₹${stats.totalRevenue}`} color="text-green-600" bg="bg-green-100" />
        </button>
      </div>

      {activeTab === 'franchises' && (
      <div id="franchises" className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Franchise Approvals</h2>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search franchises..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredFranchises.length === 0 ? (
            <div className="p-6 text-slate-500 text-center">No franchises found.</div>
          ) : (
            filteredFranchises.map(franchise => (
              <div key={franchise._id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 w-full">
                  <h3 className="font-bold text-xl text-slate-900">{franchise.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{franchise.email}</p>
                  
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="font-bold text-slate-500 block text-xs uppercase mb-1">Aadhar Number</span>
                      <span className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded">{franchise.aadharNumber || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block text-xs uppercase mb-1">PAN Number</span>
                      <span className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded uppercase">{franchise.panNumber || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block text-xs uppercase mb-1">Proposed Location</span>
                      <span className="text-slate-900">{franchise.franchiseLocation || 'Not provided'}</span>
                    </div>
                  </div>

                  <span className={`inline-block mt-4 px-3 py-1 text-xs font-bold rounded border ${franchise.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : franchise.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                    Status: {franchise.status.toUpperCase()}
                  </span>
                </div>
                {franchise.status === 'pending' && (
                  <div className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-2 w-full md:w-auto mt-4 md:mt-0">
                    <button onClick={() => handleApprove(franchise._id, 'approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all">Approve</button>
                    <button onClick={() => handleApprove(franchise._id, 'rejected')} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all">Reject</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {activeTab === 'users' && (
      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Franchise Users</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {franchises.length === 0 ? (
              <div className="p-6 text-slate-500 text-center">No franchise users found.</div>
            ) : (
              franchises.map(u => (
                <div key={u._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{u.name}</h3>
                    <p className="text-slate-500 text-sm">{u.email}</p>
                  </div>
                  <div className="flex items-center space-x-2 mt-4 md:mt-0">
                    <div className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-bold">
                      FRANCHISE
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full font-bold ${
                      u.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      u.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {u.status ? u.status.toUpperCase() : 'PENDING'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Customer Users</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {usersList.length === 0 ? (
              <div className="p-6 text-slate-500 text-center">No customers found.</div>
            ) : (
              usersList.map(u => (
                <div key={u._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{u.name}</h3>
                    <p className="text-slate-500 text-sm">{u.email}</p>
                  </div>
                  <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold">
                    CUSTOMER
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'locations' && (
      <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">All Parking Locations</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {locations.length === 0 ? (
            <div className="p-6 text-slate-500 text-center">No locations found.</div>
          ) : (
            locations.map(loc => (
              <div key={loc._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="font-bold text-lg text-slate-900">{loc.name}</h3>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded ml-2 uppercase font-bold">{loc.vehicle_type}</span>
                    <span className={`text-xs px-2 py-1 rounded ml-2 uppercase font-bold ${
                      loc.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      loc.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {loc.status || 'pending'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm">{loc.address}</p>
                  <p className="text-xs text-slate-400 mt-1">Owned by: {loc.owner_id?.name || 'Unknown'} ({loc.owner_id?.email || 'N/A'})</p>
                </div>
                <div className="flex flex-col md:items-end justify-center mt-4 md:mt-0 gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">₹{loc.price_per_hour}/hr</p>
                    <p className="text-sm text-slate-500 font-medium">{loc.total_slots} Total Slots</p>
                  </div>
                  {(!loc.status || loc.status === 'pending') && (
                    <div className="flex space-x-2 mt-2">
                      <button onClick={() => handleApproveLocation(loc._id, 'approved')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow transition-colors">Approve</button>
                      <button onClick={() => handleApproveLocation(loc._id, 'rejected')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow transition-colors">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {activeTab === 'revenue' && (
      <div className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Revenue by Franchise</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {revenue.length === 0 ? (
            <div className="p-6 text-slate-500 text-center">No revenue data found.</div>
          ) : (
            revenue.map(rev => (
              <div key={rev._id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{rev.name}</h3>
                  <p className="text-slate-500 text-sm">{rev.email}</p>
                </div>
                <div className="text-right mt-4 md:mt-0">
                  <p className="text-sm text-slate-500 font-medium">Total Generated</p>
                  <p className="text-2xl font-bold text-green-600">₹{rev.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, color, bg }) => (
  <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
    <div className={`p-4 rounded-full ${bg} ${color}`}>
      {React.cloneElement(icon, { className: 'w-8 h-8' })}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

export default AdminDashboard;
