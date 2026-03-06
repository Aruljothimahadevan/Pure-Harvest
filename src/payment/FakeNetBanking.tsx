import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const popularBanks = [
    { name: "SBI", logo: "🏛️", color: "bg-blue-50" },
    { name: "HDFC", logo: "🏦", color: "bg-blue-100" },
    { name: "ICICI", logo: "🏢", color: "bg-orange-50" },
    { name: "Axis", logo: "🏘️", color: "bg-red-50" },
];

export default function FakeNetBanking() {
    const location = useLocation();
    const state = location.state || JSON.parse(sessionStorage.getItem("paymentData") || "{}");

    const navigate = useNavigate();

    const [selectedBank, setSelectedBank] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [credentials, setCredentials] = useState({ userId: "", password: "" });

    const [showSuccess, setShowSuccess] = useState(false);

    const pay = async () => {
        if (!selectedBank || !credentials.userId || !credentials.password) {
            alert("Please select a bank and enter your login details");
            return;
        }

        setIsProcessing(true);

        // Simulate secure bank authentication
        setTimeout(async () => {

            await fetch(`http://pure-harvest.onrender.com/api/confirm-payment/${state.order_id}`, {
                method: "POST"
            });

            setIsProcessing(false);
            setShowSuccess(true);

        }, 3000);

    };
    if (!state || !state.price || !state.quantity) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-bold">No payment data found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans text-gray-800">

            {/* 🔵 Floating Back Button */}
            {/* Back Button - same style as FakeUPI */}
            {/* Back Button - green theme */}
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



            <div className="w-full max-w-md">
                {/* your existing NetBanking UI here */}


                {/* Header Summary */}
                <div className="bg-white p-6 rounded-t-[2rem] border-b border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black">Net Banking</h2>
                        <p className="text-xs text-gray-400">Secure Marketplace Payment</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase">Amount</p>
                        <p className="text-xl font-black text-green-600">₹{(state.price * state.quantity).toLocaleString()}</p>
                    </div>
                </div>

                {/* Main Interface */}
                <div className="bg-white p-8 rounded-b-[2rem] shadow-xl space-y-6">

                    {/* Popular Banks Grid */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Popular Banks</label>
                        <div className="grid grid-cols-4 gap-3">
                            {popularBanks.map((bank) => (
                                <button
                                    key={bank.name}
                                    onClick={() => setSelectedBank(bank.name)}
                                    className={`p-3 rounded-2xl flex flex-col items-center gap-1 border-2 transition-all ${selectedBank === bank.name
                                        ? "border-green-500 bg-green-50 scale-105 shadow-md"
                                        : "border-gray-50 hover:border-gray-200"
                                        }`}
                                >
                                    <span className="text-2xl">{bank.logo}</span>
                                    <span className="text-[10px] font-bold">{bank.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or choose another</span></div>
                    </div>

                    <select
                        onChange={(e) => setSelectedBank(e.target.value)}
                        value={selectedBank}
                        className="w-full border-2 border-gray-50 bg-gray-50 p-4 rounded-2xl outline-none focus:border-green-500 transition font-semibold"
                    >
                        <option value="" disabled>Select from 40+ Banks</option>
                        <option value="Kotak">Kotak Mahindra Bank</option>
                        <option value="YesBank">Yes Bank</option>
                        <option value="PNB">Punjab National Bank</option>
                        <option value="BOB">Bank of Baroda</option>
                    </select>

                    {/* Login Credentials (Simulated Bank Page) */}
                    <AnimatePresence>
                        {selectedBank && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                className="space-y-4 pt-4 border-t border-dashed"
                            >
                                <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-2">
                                    <span className="text-blue-600 font-bold">🛡️</span>
                                    <p className="text-[10px] text-blue-700 leading-tight">
                                        You are being securely connected to <strong>{selectedBank}</strong> Net Banking servers.
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Customer User ID"
                                    className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-blue-600 transition"
                                    onChange={(e) => setCredentials({ ...credentials, userId: e.target.value })}
                                />
                                <input
                                    type="password"
                                    placeholder="Login Password"
                                    className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-blue-600 transition"
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={pay}
                        disabled={isProcessing}
                        className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 ${isProcessing ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                    >
                        {isProcessing ? "Authorizing with Bank..." : "Secure Login & Pay"}
                    </button>

                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                            128-bit SSL Encrypted 🔒
                        </p>
                    </div>
                </div>
            </div>

            {/* Full Screen Processing */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-10 text-center"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-green-100 rounded-full"></div>
                            <div className="w-20 h-20 border-4 border-green-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mt-8">Verifying Credentials</h3>
                        <p className="text-gray-500 mt-2 max-w-xs">Connecting to the secure bank gateway. Please do not refresh the page.</p>
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
                                Funds secured in escrow via Net Banking
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