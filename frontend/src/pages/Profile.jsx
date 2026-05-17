import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User as UserIcon, Camera, Save } from 'lucide-react';

const presetAvatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jude',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Nala',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aidan',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
];

const Profile = () => {
  const { user, updateUserProfile } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const result = await updateUserProfile({ name, profilePic });
    
    if (result.success) {
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } else {
      setMessage({ text: result.message, type: 'error' });
    }
    setLoading(false);
  };

  if (!user) return <div className="p-8 text-center text-xl">Please log in to view this page.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-slate-800">Edit Profile</h1>
      
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8">
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg font-medium border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 flex items-center justify-center mb-4 shadow-sm relative group cursor-pointer">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-100 text-primary flex items-center justify-center text-4xl font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <div className="w-full text-center mb-2">
                <p className="text-sm font-semibold text-slate-500 mb-3">Choose an Avatar</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {presetAvatars.map((url, i) => (
                    <button 
                      key={i} 
                      type="button" 
                      onClick={() => setProfilePic(url)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${profilePic === url ? 'border-primary ring-2 ring-blue-200 scale-110' : 'border-transparent hover:border-slate-300 bg-slate-100'}`}
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setProfilePic('')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${!profilePic ? 'border-primary ring-2 ring-blue-200 bg-blue-50 text-primary scale-110' : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    title="Remove avatar"
                  >
                    <UserIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="w-full mt-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Or Image URL</label>
                <input 
                  type="url" 
                  value={profilePic} 
                  onChange={(e) => setProfilePic(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-slate-50"
                />
              </div>
            </div>

            <div className="md:w-2/3 flex flex-col space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={user.email} 
                  disabled
                  className="w-full border p-3 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email address cannot be changed.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Account Role</label>
                <input 
                  type="text" 
                  value={user.role.toUpperCase()} 
                  disabled
                  className="w-full border p-3 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed font-semibold"
                />
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full md:w-auto bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-blue-500/30 transition-all flex items-center justify-center ml-auto disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {loading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
