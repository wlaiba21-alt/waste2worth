import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Star } from 'lucide-react';
import { adminApi } from '../../api';
import { UserAvatar } from '../../components/UserAvatar';

export function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .vendors()
      .then(({ data }) => setVendors(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const name = v.businessName || v.userId?.name || '';
    const location = v.location || '';
    const q = searchTerm.toLowerCase();
    return name.toLowerCase().includes(q) || location.toLowerCase().includes(q);
  });

  if (loading) return <div className="text-text-light">Loading vendors...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Manage Vendors</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-eco-green"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-sm text-text-light bg-white/5">
                <th className="p-4 font-medium">Vendor</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Specialization</th>
                <th className="p-4 font-medium">Rating</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-light">
                    No vendors found
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const userId = vendor.userId?._id?.toString() || vendor.userId?.toString();
                  const photo = vendor.photo || vendor.userId?.avatar;
                  const name = vendor.businessName || vendor.userId?.name || 'Vendor';
                  return (
                    <tr key={vendor._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={photo} name={name} className="w-8 h-8 rounded-full object-cover" />
                          <p className="text-sm font-medium text-white">{name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-text-light">{vendor.location}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(vendor.specialization || []).map((spec) => (
                            <span key={spec} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded text-text-light">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-white">
                          <Star className="w-3 h-3 text-yellow-accent fill-yellow-accent" />
                          {vendor.rating ?? 0}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium ${
                            vendor.approved ? 'bg-eco-green/20 text-eco-green' : 'bg-yellow-accent/20 text-yellow-accent'
                          }`}
                        >
                          {vendor.approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {userId && (
                          <Link
                            to={`/vendors/${userId}`}
                            className="inline-flex p-1.5 text-text-light hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
