import React, { useEffect, useState } from "react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { vendorApi, storeApi } from "../../api";
import { AddPortfolioModal } from "./AddPortfolioModal";

export function Portfolio() {
  const { currentUser, vendorProfile, refreshUser } = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPortfolio = async () => {
    if (vendorProfile?.portfolio) {
      setPortfolio(vendorProfile.portfolio);
    }
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    try {
      const [portfolioRes, productsRes] = await Promise.all([
        vendorApi.get(currentUser.id),
        storeApi.myProducts(),
      ]);
      setPortfolio(portfolioRes.data.portfolio || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error("Error loading portfolio data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [vendorProfile, currentUser?.id]);

  const handleDelete = async (index) => {
    if (!window.confirm("Remove this project from your portfolio?")) return;
    try {
      const { data } = await vendorApi.deletePortfolio(index);
      setPortfolio(data);
      await refreshUser();
      toast.success("Project removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove project");
    }
  };

  const openAddModal = () => setShowAddModal(true);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Portfolio Management</h2>
        <button type="button" onClick={openAddModal} className="btn-primary py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      {loading ? (
        <p className="text-text-light text-sm">Loading portfolio...</p>
      ) : (
        <>
          {portfolio.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-white">Recycling Projects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {portfolio.map((item, index) => (
                  <div key={`${item.description}-${index}`} className="glass-card overflow-hidden group">
                    <div className="relative h-48 flex">
                      <div className="w-1/2 relative">
                        <img src={item.before} alt="Before" className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-dark-bg/80 px-2 py-1 rounded text-xs font-medium border border-white/10">
                          Before
                        </div>
                      </div>
                      <div className="w-1/2 relative">
                        <img src={item.after} alt="After" className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-eco-green/90 px-2 py-1 rounded text-xs font-medium text-white">After</div>
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          className="w-10 h-10 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
                          title="Remove project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-text-light">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {products.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-white mt-8">Store Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="glass-card overflow-hidden">
                    <div className="relative h-48">
                      <img
                        src={product.images?.[0] || "https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=recycled%20product%20placeholder&image_size=square"}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-sky-blue/90 px-2 py-1 rounded text-xs font-medium text-white">
                        {product.status}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-1">{product.title}</h4>
                      <p className="text-sm text-text-light mb-2">{product.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-eco-green font-bold">${product.price?.toFixed?.(2) || "0.00"}</span>
                        <span className="text-xs text-text-light">{product.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {portfolio.length === 0 && products.length === 0 && (
            <div className="glass-card p-12 text-center">
              <ImageIcon className="w-12 h-12 text-text-light/50 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">No portfolio items yet</h3>
              <p className="text-text-light mb-6">Showcase your recycling process to attract more customers.</p>
              <button type="button" onClick={openAddModal} className="btn-secondary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add First Project
              </button>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <AddPortfolioModal
          onClose={() => setShowAddModal(false)}
          onCreated={(items) => {
            setPortfolio(items);
            refreshUser();
          }}
        />
      )}
    </div>
  );
}