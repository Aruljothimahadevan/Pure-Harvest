import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function FakeCard() {

    const navigate = useNavigate();

    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [name, setName] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, "").substring(0, 16);
        const formatted = val.match(/.{1,4}/g)?.join(" ") || "";
        setCardNumber(formatted);
    };

    const pay = () => {
        if (cardNumber.length < 19 || expiry.length < 5 || cvv.length < 3) {
            alert("Please enter valid card details");
            return;
        }

        setIsProcessing(true);

        setTimeout(async () => {

            await fetch(`https://pure-harvest.onrender.com/api/confirm-payment/${state.order_id}`, {
                method: "POST"
            });

            setIsProcessing(false);
            setShowSuccess(true);

        }, 3000);

    };

    const location = useLocation();

    const state =
        location.state ||
        (() => {
            try {
                return JSON.parse(sessionStorage.getItem("paymentData") || "{}");
            } catch {
                return {};
            }
        })();

    if (!state || typeof state.price !== "number" || typeof state.quantity !== "number") {

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                {/* Back Button */}
                {/* Back Button - fixed like UPI page */}
                {/* Floating Back Button */}
                <div className="fixed top-4 left-4 z-[9999]">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-3 pr-5 
      bg-white/95 backdrop-blur-md rounded-full shadow-xl 
      border border-gray-200 text-blue-700 
      hover:text-blue-800 transition-all active:scale-95 group"
                    >
                        <div className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full 
      shadow-md group-hover:bg-blue-700 transition-colors">
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



                <p className="text-gray-500 font-bold">No payment data found</p>
            </div>
        );
    }
    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "").slice(0, 4); // only numbers, max 4

        // First digit must be 0 or 1
        if (val.length === 1 && !["0", "1"].includes(val)) return;

        // Validate month
        if (val.length >= 2) {
            const month = parseInt(val.slice(0, 2));
            if (month < 1 || month > 12) return;
        }

        // Auto add slash
        if (val.length >= 3) {
            val = val.slice(0, 2) + "/" + val.slice(2);
        }

        setExpiry(val);
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4 font-sans">
            {/* Floating Blue Back Button */}
            <div className="fixed top-5 left-5 z-[9999]">
                {/* Back Button - blue theme */}
                <button
                    onClick={() => navigate(-1)}
                    className="fixed top-4 left-4 flex items-center gap-3 pr-5 
     bg-white/95 backdrop-blur-md rounded-full shadow-xl 
     border border-gray-200 text-green-700 
     hover:text-green-800 transition-all active:scale-95 group z-[100]"
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



            <div className="w-full max-w-md">

                {/* Dynamic Virtual Card */}
                <motion.div
                    initial={{ rotateY: -10, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    className="relative h-56 w-full bg-gradient-to-br from-gray-800 to-black rounded-2xl shadow-2xl p-6 text-white mb-8 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-20 text-4xl font-bold italic">VISA</div>
                    <div className="h-12 w-16 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-lg mb-8 shadow-inner" /> {/* Chip */}
                    <div className="text-2xl tracking-[4px] mb-4 font-mono">
                        {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] uppercase opacity-60">Card Holder</p>
                            <p className="font-bold tracking-wide uppercase">{name || "Your Name"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase opacity-60">Expires</p>
                            <p className="font-bold tracking-wide">{expiry || "MM/YY"}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Payment Form */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl space-y-5 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="font-black text-2xl text-gray-800">Checkout</h2>
                        <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm">
                            ₹{(state.price * state.quantity).toLocaleString()}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Cardholder Name</label>
                            <input
                                className="w-full border-b-2 p-3 outline-none focus:border-blue-600 transition"
                                placeholder="John Doe"
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Card Number</label>
                            <input
                                className="w-full border-b-2 p-3 outline-none focus:border-blue-600 transition font-mono"
                                placeholder="0000 0000 0000 0000"
                                value={cardNumber}
                                onChange={handleCardChange}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Expiry</label>
                                <input
                                    className="w-full border-b-2 p-3 outline-none focus:border-blue-600 transition"
                                    placeholder="MM/YY"
                                    value={expiry}
                                    onChange={handleExpiryChange}
                                    maxLength={5}
                                />

                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">CVV</label>
                                <input
                                    className="w-full border-b-2 p-3 outline-none focus:border-blue-600 transition"
                                    placeholder="•••"
                                    maxLength={3}
                                    onChange={(e) => setCvv(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={pay}
                        disabled={isProcessing}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all mt-4"
                    >
                        {isProcessing ? "Verifying..." : `Confirm Payment`}
                    </button>

                    <div className="flex justify-center items-center gap-2 opacity-30 mt-2">
                        <span className="text-[10px] font-bold">PCI-DSS COMPLIANT 🔒</span>
                    </div>
                </div>
            </div>

            {/* Processing Overlay */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-10 text-center"
                    >
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <h3 className="text-xl font-bold text-gray-800">Secure Authorization</h3>
                        <p className="text-gray-500 mt-2 italic">Talking to your bank... This may take a few seconds.</p>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.6, y: 40 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full"
                        >
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    className="text-5xl text-green-600"
                                >
                                    ✔
                                </motion.div>
                            </div>

                            <h2 className="text-2xl font-black text-gray-800 mb-2">
                                Payment Successful
                            </h2>

                            <p className="text-gray-500 mb-4">
                                Your money is safely held in escrow
                            </p>

                            <div className="bg-green-50 rounded-xl py-3 mb-6 font-black text-green-700 text-lg">
                                ₹{(state.price * state.quantity).toLocaleString()}
                            </div>

                            <button
                                onClick={() =>
                                    navigate("/buyer-orders", {
                                        state: { highlightOrderId: state.order_id },
                                        replace: true
                                    })
                                }

                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-bold shadow-lg transition"
                            >
                                Go to My Orders 📦
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}