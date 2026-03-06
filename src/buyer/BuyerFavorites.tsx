import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import BuyerTopNavBar from "./BuyerTopNavBar";

export default function BuyerFavorites() {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<any[]>([]);

    useEffect(() => {
        const buyerId = sessionStorage.getItem("buyerId");

        fetch(`https://pure-harvest.onrender.com/api/buyer/favorites/${buyerId}`)
            .then(res => res.json())
            .then(data => setFavorites(data));
    }, []);

    return (
        <>
            <BuyerTopNavBar />

            <div className="min-h-screen bg-gray-50 pt-24 p-6 pb-24 font-sans">

                {/* --- HEADER --- */}
                <div className="relative flex items-center justify-center mb-10">               
                    {/* Center Title */}
                    <h2 className="absolute left-1/2 -translate-x-1/2 text-3xl font-black text-gray-800 tracking-tight">
                        Favorites
                    </h2>

                    {/* Right Side Item Count */}
                    <div className="ml-auto bg-red-50 text-red-500 px-4 py-2 rounded-2xl font-bold text-sm hidden sm:block">
                        {favorites.length} Items
                    </div>

                </div>
                {favorites.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full"
                        >
                            <div className="text-6xl mb-4">❤️</div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">
                                No Favorites Yet
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Save crops you love to buy later!
                            </p>
                            <button
                                onClick={() => navigate("/buyer-dashboard")}
                                className="px-8 py-3 rounded-full bg-green-600 text-white font-bold hover:bg-green-700 transition"
                            >
                                Browse Crops 🌾
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* --- CARDS SECTION --- */}
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((crop) => (
                        <motion.div
                            key={crop.id}
                            whileHover={{
                                y: -6,
                                boxShadow: "0 18px 25px rgba(0,0,0,0.1)"
                            }}
                            transition={{ type: "spring", stiffness: 260 }}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative text-center"
                        >
                            {/* Remove favorite */}
                            <button
                                onClick={async () => {
                                    const buyerId = sessionStorage.getItem("buyerId");
                                    if (!buyerId) return;

                                    const cropId = Number(crop.id);

                                    await fetch(`https://pure-harvest.onrender.com/api/buyer/favorites/${cropId}/${buyerId}`, {
                                        method: "DELETE"
                                    });

                                    setFavorites(prev => prev.filter(f => Number(f.id) !== cropId));
                                }}
                                className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full 
             border border-red-400 text-red-500 bg-red-50 font-semibold text-sm transition"
                            >
                                <span>Remove</span>
                                <span className="text-xl">💔</span>
                            </button>


                            {/* Crop icon */}
                            <div className="w-16 h-16 mx-auto bg-green-50 rounded-3xl flex items-center justify-center text-4xl mb-4">
                                🌾
                            </div>

                            <h4 className="text-xl font-black text-gray-800 mb-1">
                                {crop.name}
                            </h4>

                            <p className="text-xs text-gray-400 mb-4">
                                Farmer ID: <span className="font-bold text-gray-600">{crop.farmer_id}</span>
                            </p>

                            {/* Details */}
                            <div className="space-y-2 text-sm mb-5">
                                <p>
                                    Quantity: <span className="font-bold text-gray-800">{crop.quantity} kg</span>
                                </p>

                                <p>
                                    Price per kg: <span className="font-bold text-green-700">₹{crop.price}</span>
                                </p>

                                <p className="text-lg font-black text-gray-800">
                                    Total: ₹{(crop.price * crop.quantity).toFixed(2)}
                                </p>
                            </div>

                            <button
                                onClick={() => navigate("/buyer-dashboard")}
                                className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition"
                            >
                                Buy Now
                            </button>
                        </motion.div>


                    ))}
                </div>
            </div>
        </>
    );
}