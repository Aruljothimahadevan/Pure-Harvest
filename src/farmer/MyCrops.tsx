import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FarmerNavBar from "./FarmerTopNavBar";


export default function MyCrops() {
  const [crops, setCrops] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const navigate = useNavigate();
  const filteredCrops = filter === "All"
    ? crops
    : crops.filter(c => c.status === filter);
  const [loading, setLoading] = useState(true);
  const deleteCrop = async (id: number) => {
    await fetch(`https://pure-harvest.onrender.com/api/crop/${id}`, { method: "DELETE" });
    setCrops(crops.filter(c => c.id !== id));
  };

  useEffect(() => {
    const farmerId = sessionStorage.getItem("farmerId");
    if (!farmerId) return;

    fetch(`https://pure-harvest.onrender.com/api/farmer/crops/${farmerId}`)
      .then(res => res.json())
      .then(data => setCrops(data))
      .finally(() => setLoading(false)); // 👈 important
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-16">
        <FarmerNavBar />

        {/* Sticky filter stays visible */}
        <div className="sticky top-[72px] bg-gray-50 py-4 border-b border-gray-100 shadow-sm">
          <div className="max-w-2xl mx-auto px-6 flex justify-center gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-20 rounded-full shimmer" />
            ))}
          </div>
        </div>

        <main className="max-w-2xl mx-auto px-6 mt-6 space-y-4">

          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="bg-white rounded-3xl p-5 border shadow-sm space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 shimmer rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>

                <div className="space-y-2 text-right">
                  <div className="h-5 w-20 shimmer rounded" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="flex gap-2">
                  <div className="w-8 h-8 shimmer rounded-xl" />
                  <div className="w-8 h-8 shimmer rounded-xl" />
                </div>
              </div>
            </div>
          ))}

        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-16 relative">
      <FarmerNavBar />
      {/* FILTER ROW */}
      <div className="sticky top-[72px] bg-gray-50 z-40 py-4 border-b border-gray-100 shadow-sm">  <div className="max-w-2xl mx-auto px-6 flex justify-center gap-4">
        {["All", "Active", "Pending", "Sold"].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${filter === tab
              ? "bg-green-600 text-white shadow-md scale-105"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-100"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>
      </div>
      <main className="max-w-2xl mx-auto px-6 mt-4 space-y-4">
        <AnimatePresence mode="wait">

          {!loading && filteredCrops.length > 0 && (
            <>
              {filteredCrops.map((crop) => (
                <motion.div
                  key={crop.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${crop.status === 'Active' ? 'bg-green-500' :
                    crop.status === 'Sold' ? 'bg-gray-300' : 'bg-orange-400'
                    }`} />

                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{crop.name}</h3>
                      <p className="text-gray-400 text-xs">Posted on {crop.date}</p>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      <div className="grid grid-cols-[70px_10px_auto] gap-x-1 gap-y-1 justify-end">

                        <span className="text-gray-400 text-right">Price</span>
                        <span className="text-gray-400 text-center">:</span>
                        <span className="text-green-700 font-bold text-left">
                          ₹{crop.price} / kg
                        </span>

                        <span className="text-gray-400 text-right">Qty</span>
                        <span className="text-gray-400 text-center">:</span>
                        <span className="text-green-700 font-bold text-left">
                          {crop.qty} kg
                        </span>

                        <span className="text-gray-400 text-right">Total</span>
                        <span className="text-gray-400 text-center">:</span>
                        <span className="text-emerald-800 font-black text-left bg-emerald-50 px-2 py-0.5 rounded-lg">
                          ₹{(crop.price * crop.qty).toLocaleString()}
                        </span>

                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between border-t pt-4">
                    <span className="text-gray-400 text-xs">👁️ {crop.views}</span>

                    <button
                      onClick={() => deleteCrop(crop.id)}
                      className="text-red-500"
                    >
                      🗑️
                    </button>
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {!loading && filteredCrops.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-gray-400"
            >
              No crops found in this category.
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Floating Action Button to Add New */}
      <button
        onClick={() => navigate("/post-crop")}
        className="fixed bottom-8 right-8 w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-20"
      >
        +
      </button>
    </div >
  );

}
