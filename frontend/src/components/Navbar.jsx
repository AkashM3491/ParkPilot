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
              <div className="flex items-center space-x-4">
                <Link to={getDashboardLink()} className="flex items-center space-x-1 text-slate-600 hover:text-primary transition-colors">
                  <UserIcon className="h-5 w-5" />
                  <span className="font-medium">{user.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
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
