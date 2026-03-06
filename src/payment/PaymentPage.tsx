import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function PaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const item = location.state; // Contains cropId, name, price, total

    const [method, setMethod] = useState("upi");
    const [isProcessing, setIsProcessing] = useState(false);

    if (!item) return <div className="p-10 text-center">No order data found.</div>;
    const safePrice = Number(item.price) || 0;
    const safeQty = Number(item.quantity) || 0;
    const total = (safePrice * safeQty).toFixed(2);


    const handleConfirmPayment = async () => {
        const buyerId = sessionStorage.getItem("buyerId");
        if (!buyerId) return alert("Login again");

        setIsProcessing(true);

        const res = await fetch("http://127.0.0.1:5000/api/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                crop_id: item.cropId,
                buyer_id: buyerId,
                quantity: item.quantity,
                payment_method: method
            })
        });

        const data = await res.json();
        setIsProcessing(false);

        if (data.success) {

            const paymentData = {
                ...item,
                order_id: data.order_id   // 👈 VERY IMPORTANT
            };

            sessionStorage.setItem("paymentData", JSON.stringify(paymentData));

            navigate(`/pay/${method}`);
        } else {
            alert(data.error || "Payment failed");
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            {/* Floating Back Button */}
            <div className="fixed top-6 left-6 z-50">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-3 pr-5 bg-white rounded-full shadow-lg border border-gray-100 
               text-green-700 hover:text-green-800 transition-all active:scale-95 group"
                >
                    <div className="w-12 h-12 flex items-center justify-center bg-green-600 text-white rounded-full 
                    shadow-md group-hover:bg-green-700 transition-colors">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                            stroke="currentColor"
                            className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                            />
                        </svg>
                    </div>

                    <span className="font-bold text-gray-700 uppercase tracking-widest text-xs">
                        Back
                    </span>
                </button>
            </div>



            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden"
            >
                <div className="bg-green-600 p-6 text-white text-center">
                    <h2 className="text-xl font-bold">Secure Escrow Payment</h2>
                    <p className="text-sm opacity-80">Money is held safely until delivery</p>
                </div>

                <div className="p-6">
                    {/* Order Summary */}
                    <div className="mb-6 p-5 bg-gray-50 rounded-2xl space-y-3">

                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                            Order Summary
                        </h3>

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Product</span>
                            <span className="font-bold text-gray-800">{item.name}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Quantity</span>
                            <span className="font-bold text-gray-800">
                                {item.quantity} kg
                            </span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Price per kg</span>
                            <span className="font-bold text-green-700">
                                ₹{item.price}
                            </span>
                        </div>

                        <div className="border-t pt-3 flex justify-between text-base">
                            <span className="font-bold text-gray-700">Total Payable</span>
                            <span className="font-black text-green-700 text-lg">
                                ₹{total}

                            </span>
                        </div>

                    </div>


                    {/* Methods */}
                    <div className="space-y-3">
                        {[
                            { label: "UPI", value: "upi" },
                            { label: "Card", value: "card" },
                            { label: "Net Banking", value: "netbanking" }
                        ].map((type) => (
                            <label
                                key={type.value}
                                className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition 
      ${method === type.value ? 'border-green-500 bg-green-50' : 'border-gray-100'}`}
                            >
                                <input
                                    type="radio"
                                    name="payment"
                                    className="hidden"
                                    onChange={() => setMethod(type.value)}
                                />
                                <span className="text-2xl mr-3">
                                    {type.label === 'UPI' ? '📱' : type.label === 'Card' ? '💳' : '🏦'}
                                </span>
                                <span className="font-bold text-gray-700">{type.label}</span>
                                {method === type.value && <span className="ml-auto text-green-600">✓</span>}
                            </label>
                        ))}

                    </div>

                    <button
                        onClick={handleConfirmPayment}
                        disabled={isProcessing}
                        className={`w-full mt-8 py-4 rounded-2xl font-black text-white transition shadow-lg ${isProcessing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isProcessing ? "Processing Security..." : `Pay ₹${total}`}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4 px-6">
                        By clicking pay, you agree to hold funds in AgriConnect Escrow.
                        Funds are released to the farmer only after delivery confirmation.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}