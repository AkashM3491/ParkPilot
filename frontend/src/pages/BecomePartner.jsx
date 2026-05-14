import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const BecomePartner = () => {
  const { user, upgradeFranchise } = useContext(AuthContext);
  const navigate = useNavigate();

  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [franchiseLoc, setFranchiseLoc] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only allow standard users to upgrade
    if (!user || user.role !== 'user') {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must agree to the terms and permissions to become a franchise partner.');
      return;
    }
    
    setLoading(true);
    const res = await upgradeFranchise({ aadharNumber: aadhar, panNumber: pan, franchiseLocation: franchiseLoc });
    setLoading(false);
    
    if (res.success) {
      navigate('/franchise');
    } else {
      setError(res.message);
    }
  };

  if (!user || user.role !== 'user') return null;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center mb-2">Partner Application</h2>
        <p className="text-center text-slate-600 mb-6">Upgrade your account to list your parking spaces.</p>
        
        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm font-semibold">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-inner">
            <h3 className="font-bold text-slate-800 text-md border-b border-blue-200 pb-2 mb-4">Verification Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Aadhar Card Number</label>
                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={aadhar} onChange={(e) => setAadhar(e.target.value)} required placeholder="12-digit Aadhar Number" maxLength="12" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">PAN Card Number</label>
                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none uppercase" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} required placeholder="10-digit PAN" maxLength="10" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Proposed Franchise City/Location</label>
                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={franchiseLoc} onChange={(e) => setFranchiseLoc(e.target.value)} required placeholder="e.g. Mumbai, Andheri" />
              </div>
            </div>
            
            <div className="flex items-start mt-6 pt-4 border-t border-blue-200">
              <input type="checkbox" id="terms" className="mt-1 mr-3 w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
              <label htmlFor="terms" className="text-sm text-slate-700 leading-tight cursor-pointer">
                I grant ParkPilot permission to verify my identity using the provided documents, and I agree to the Franchise Partner Terms & Conditions and Revenue Sharing Agreement.
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg mt-4 disabled:bg-slate-400"
          >
            {loading ? 'Submitting Application...' : 'Submit Partner Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BecomePartner;
