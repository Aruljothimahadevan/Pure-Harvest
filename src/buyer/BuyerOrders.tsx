import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import BuyerTopNavBar from "./BuyerTopNavBar";
import { useLocation } from "react-router-dom";
export default function BuyerOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const location = useLocation();
    const highlightOrderId = location.state?.highlightOrderId;
    const [showReview, setShowReview] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [rating, setRating] = useState({
        quality: 5,
        freshness: 5,
        packaging: 5
    });
    const [reviewedOrders, setReviewedOrders] = useState<number[]>([]);
    useEffect(() => {
        const buyerId = sessionStorage.getItem("buyerId")
        fetch(`http://127.0.0.1:5000/api/buyer/orders/${buyerId}`)
            .then(res => res.json())
            .then(data => {
                setOrders(data);

                const reviewed = data
                    .filter((o: any) => o.reviewed)
                    .map((o: any) => o.id);

                setReviewedOrders(reviewed);
            });
    }, []);
    useEffect(() => {
        if (highlightOrderId) {
            const element = document.getElementById(`order-${highlightOrderId}`);
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [orders]);
    return (
        <>
            <BuyerTopNavBar />

            <div className="min-h-screen bg-gray-50 pt-24 p-6 pb-24 font-sans">

                {/* --- HEADER --- */}
                <div className="relative flex items-center justify-center mb-10">
                    {/* Center Title */}
                    <h2 className="absolute left-1/2 -translate-x-1/2 text-3xl font-black text-gray-800 tracking-tight">
                        My Orders
                    </h2>

                </div>

                {/* EMPTY STATE DIALOG */}
                {orders.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 40 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full mx-4"
                        >
                            <div className="text-6xl mb-4">📦</div>

                            <h3 className="text-2xl font-black text-gray-800 mb-2">
                                No Orders Yet
                            </h3>

                            <p className="text-gray-500 mb-6">
                                Start buying fresh crops directly from farmers!
                            </p>

                            <button
                                onClick={() => navigate("/buyer-dashboard")}
                                className="px-8 py-3 rounded-full bg-green-600 text-white font-bold hover:bg-green-700 transition"
                            >
                                Browse Marketplace 🌾
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* --- ORDERS LIST --- */}
                <div className="max-w-5xl mx-auto space-y-5">
                    {orders.map((order, index) => (
                        <motion.div
                            id={`order-${order.id}`}
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 260 }}
                            whileHover={{ scale: 1.02 }}
                            className={`rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between transition-all duration-500
    ${order.id === highlightOrderId
                                    ? "bg-red-50 border-2 border-red-500 shadow-2xl scale-105 ring-4 ring-red-200"
                                    : "bg-white border border-gray-100 shadow-md"}
`}                       >

                            {/* LEFT — Crop Info */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-4xl">
                                    🌾
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-gray-800">{order.crop}</h3>
                                    <p className="text-sm text-gray-400">
                                        Order #{orders.length - index} • Farmer {order.farmer}
                                    </p>
                                </div>
                            </div>

                            {/* MIDDLE — Details */}
                            <div className="flex gap-8 text-center">

                                <div>
                                    <p className="text-xs text-gray-400">Quantity</p>
                                    <p className="font-black text-gray-800">{order.quantity} kg</p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400">Price/kg</p>
                                    <p className="font-black text-green-700">₹{order.price}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400">Total</p>
                                    <p className="font-black text-gray-800">₹{order.amount}</p>
                                </div>

                            </div>

                            {/* RIGHT — Status + Action */}
                            <div className="flex flex-col items-center gap-3">

                                <span className={`px-5 py-1.5 rounded-full text-xs font-black uppercase
          ${order.status === "Completed"
                                        ? "bg-green-100 text-green-700"
                                        : order.status === "Cancelled"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-blue-100 text-blue-700"}
        `}>
                                    {order.status}
                                </span>
                                {/* Confirm Delivery Button */}
                                {order.status !== "Completed" && (
                                    <button
                                        disabled={order.delivery_status !== "Delivered"}
                                        onClick={async () => {

                                            const res = await fetch(
                                                `http://127.0.0.1:5000/api/confirm-delivery/${order.id}`,
                                                { method: "POST" }
                                            );

                                            const data = await res.json();

                                            if (data.success) {

                                                setOrders(prev =>
                                                    prev.map(o =>
                                                        o.id === order.id ? { ...o, status: "Completed" } : o
                                                    )
                                                );
                                            }
                                        }}
                                        className={`px-5 py-2 rounded-full text-sm font-bold transition
      ${order.delivery_status === "Delivered"
                                                ? "bg-green-600 hover:bg-green-700 text-white"
                                                : "bg-gray-300 text-gray-500 cursor-not-allowed"}
    `}
                                    >
                                        {order.delivery_status === "Delivered"
                                            ? "✅ Confirm Delivery"
                                            : "🚚 On the Way"}
                                    </button>
                                )}

                                {/* ⭐ Rate Farmer Button */}
                                {order.status === "Completed" && !reviewedOrders.includes(order.id) && (
                                    <button
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setShowReview(true);
                                        }}
                                        className="px-5 py-2 rounded-full text-sm font-bold bg-yellow-500 text-white hover:bg-yellow-600 transition"
                                    >
                                        ⭐ Rate Farmer
                                    </button>
                                )}

                                {/* ✅ Review Submitted Badge */}
                                {order.status === "Completed" && reviewedOrders.includes(order.id) && (
                                    <div className="px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                                        ✔ Reviewed
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {showReview && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-2xl w-80 text-center">

                            <h3 className="text-xl font-bold mb-4">Rate Farmer</h3>

                            {["quality", "freshness", "packaging"].map((field) => (
                                <div key={field} className="mb-3">
                                    <p className="text-sm capitalize">{field}</p>
                                    <div className="flex justify-center gap-1 mt-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span
                                                key={star}
                                                onClick={() =>
                                                    setRating({
                                                        ...rating,
                                                        [field]: star
                                                    })
                                                }
                                                className={`text-2xl cursor-pointer ${(rating as any)[field] >= star
                                                    ? "text-yellow-400"
                                                    : "text-gray-300"
                                                    }`}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={async () => {
                                    await fetch(`http://127.0.0.1:5000/api/review/${selectedOrder.id}`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(rating)
                                    });

                                    setReviewedOrders(prev => [...prev, selectedOrder.id]);
                                    setShowReview(false);
                                }}
                                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-xl"
                            >
                                Submit Review
                            </button>

                        </div>
                    </div>
                )}
            </div >
        </>

    );
}