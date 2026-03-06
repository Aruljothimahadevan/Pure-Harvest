import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FarmerNavBar from "./FarmerTopNavBar";

export default function FarmerDashboard() {
    const [userName, setUserName] = useState("");
    const [stats, setStats] = useState<any[]>([]);
    const [activeCrops, setActiveCrops] = useState<any[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState(0)
    const [reviewCount, setReviewCount] = useState(0)
    const farmerId = sessionStorage.getItem("farmerId");
    useEffect(() => {
        if (!farmerId) {
            navigate("/login");
            return;
        }

        const loadDashboard = async () => {
            try {
                const profileRes = await fetch(`http://localhost:5000/api/farmer/profile/${farmerId}`);
                const profileData = await profileRes.json();

                sessionStorage.setItem("userName", profileData.name);
                sessionStorage.setItem("profileImage", profileData.profile_image || "");
                window.dispatchEvent(new Event("profileUpdated"));
                const res = await fetch(`http://localhost:5000/api/farmer/dashboard/${farmerId}`);
                const data = await res.json();

                setUserName(sessionStorage.getItem("userName") || "");
                setRating(data.rating)
                setReviewCount(data.reviewCount)
                setStats([
                    { label: "Total Earnings", value: `₹${data.totalEarnings}`, icon: "💰", color: "bg-emerald-100 text-emerald-700" },
                    { label: "Active Listings", value: data.activeListings, icon: "📦", color: "bg-blue-100 text-blue-700" },
                    { label: "Orders Pending", value: data.ordersPending, icon: "⏳", color: "bg-orange-100 text-orange-700" },
                    { label: "Market Rank", value: data.marketRank, icon: "🏆", color: "bg-purple-100 text-purple-700" }
                ]);

                setActiveCrops(data.activeCrops);

            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();

    }, []);
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-24 p-6 animate-pulse">
                <FarmerNavBar />

                {/* Header skeleton */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-full bg-gray-300" />
                    <div className="space-y-2">
                        <div className="h-4 w-40 bg-gray-300 rounded" />
                        <div className="h-3 w-64 bg-gray-200 rounded" />
                    </div>
                </div>

                {/* Stats skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className="bg-white p-6 rounded-3xl shadow-sm space-y-4"
                        >
                            <div className="w-12 h-12 bg-gray-300 rounded-2xl" />
                            <div className="h-3 bg-gray-200 w-24 rounded" />
                            <div className="h-5 bg-gray-300 w-32 rounded" />
                        </div>
                    ))}
                </div>

                {/* Listings skeleton (FULL WIDTH like real UI) */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <div className="h-4 bg-gray-300 w-40 rounded mb-4" />

                    {[1, 2, 3, 4, 5].map(i => (
                        <div
                            key={i}
                            className="h-4 bg-gray-200 rounded w-full"
                        />
                    ))}
                </div>
            </div>
        );
    }
    const renderStars = () => {
        const stars = [];

        for (let i = 1; i <= 5; i++) {

            if (rating >= i) {
                stars.push(
                    <span
                        key={i}
                        className="text-yellow-400 text-3xl drop-shadow-md"
                    >
                        ★
                    </span>
                );

            } else if (rating >= i - 0.5) {
                stars.push(
                    <span
                        key={i}
                        className="text-yellow-400 text-3xl drop-shadow-md"
                    >
                        ★
                    </span>
                );

            } else {
                stars.push(
                    <span
                        key={i}
                        className="text-gray-300 text-3xl"
                    >
                        ★
                    </span>
                );
            }
        }

        return stars;
    };
    return (
        <div className="min-h-screen bg-gray-50 pt-16 pb-16 relative">
            <FarmerNavBar />
            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <img
                            src={
                                sessionStorage.getItem("profileImage") ||
                                `https://ui-avatars.com/api/?name=${userName}`
                            }
                            className="w-12 h-12 rounded-full object-cover border"
                        />

                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-gray-800">
                                WELCOME, {userName} 🙏
                            </h1>

                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex gap-1 animate-pulse">
                                    {renderStars()}
                                </div>

                                <span className="text-sm font-semibold text-gray-600">
                                    {rating} ({reviewCount})
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate("/post-crop")}
                        className="bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-700 shadow-lg transition"
                    >
                        + Post New Crop
                    </button>
                </header>


                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -6 }}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"
                        >
                            <div
                                className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-2xl mb-4`}
                            >
                                {stat.icon}
                            </div>
                            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-8">                    {/* Listings */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">                        <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">
                            Current Listings
                        </h3>
                        <span
                            onClick={() => navigate("/my-crops")}
                            className="text-green-600 text-sm font-semibold cursor-pointer"
                        >
                            View All
                        </span>
                    </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-gray-400 text-sm uppercase">
                                        <th className="pb-4">Crop</th>
                                        <th className="pb-4">Quantity</th>
                                        <th className="pb-4">Price</th>
                                        <th className="pb-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeCrops.map((crop) => (
                                        <tr
                                            key={crop.id}
                                            className="border-t border-gray-50 text-gray-700"
                                        >
                                            <td className="py-4 font-semibold">{crop.name}</td>
                                            <td className="py-4">{crop.quantity}</td>
                                            <td className="py-4">₹{crop.price}/kg</td>
                                            <td className="py-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-bold
                          ${crop.status === "High Demand"
                                                            ? "bg-green-100 text-green-700"
                                                            : crop.status === "Low Stock"
                                                                ? "bg-orange-100 text-orange-700"
                                                                : "bg-gray-100 text-gray-600"
                                                        }`}
                                                >
                                                    {crop.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* your existing dashboard JSX */}
                </motion.div>
            </main>

        </div>
    );

}