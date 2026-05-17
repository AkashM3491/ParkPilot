import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CarFront, LogOut, User as UserIcon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'franchise') return '/franchise';
    return '/dashboard';
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <CarFront className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl text-dark tracking-tight">ParkPilot</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-slate-600 hover:text-primary font-medium transition-colors">Home</Link>
            {user ? (
              <div className="relative group flex items-center h-full">
                <button className="flex items-center space-x-2 text-slate-600 hover:text-primary transition-colors focus:outline-none py-2">
                  <div className="w-9 h-9 bg-blue-100 text-primary rounded-full flex items-center justify-center font-bold overflow-hidden border-2 border-transparent hover:border-primary transition-all shadow-sm">
                    {user.profilePic ? (
                      <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="font-medium">{user.name}</span>
                </button>
                <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-xl py-2 z-50 hidden group-hover:block border border-slate-100 transition-all opacity-0 group-hover:opacity-100">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role} Account</p>
                  </div>
                  <Link to={getDashboardLink()} className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-primary transition-colors">
                    My Dashboard
                  </Link>
                  <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-primary transition-colors">
                    Edit Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center mt-1 border-t border-slate-100 pt-2"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-slate-600 hover:text-primary font-medium transition-colors">Login</Link>
                <Link to="/register" className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md shadow-blue-500/30">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
