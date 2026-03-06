import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function FakeUPI() {
  const state = JSON.parse(sessionStorage.getItem("paymentData") || "{}");

  const navigate = useNavigate();
  const total = (state.price * state.quantity).toFixed(1);
  const [upiId, setUpiId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePayment = async () => {
    if (!upiId.includes("@")) {
      alert("Please enter a valid UPI ID (e.g., name@okaxis)");
      return;
    }

    setIsProcessing(true);

    setTimeout(async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/api/confirm-payment/${state.order_id}`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.error || "Payment failed");
          setIsProcessing(false);
          return;
        }

        setIsProcessing(false);
        setShowSuccess(true);

      } catch (err) {
        console.error("Payment error:", err);
        alert("Server not responding");
        setIsProcessing(false);
      }
    }, 2500);
  };
  return (

    <div className="min-h-screen bg-[#f2f2f2] font-sans relative">
      {/* Back Button - fixed on page */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 flex items-center gap-3 pr-5 
           bg-white/95 backdrop-blur-md rounded-full shadow-xl 
           border border-gray-200 text-blue-700 
           hover:text-blue-800 transition-all active:scale-95 group z-[100]"

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

      <div className="flex items-center justify-center min-h-screen">
        <motion.div


          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white w-full max-w-sm min-h-[600px] shadow-2xl relative flex flex-col sm:rounded-[3rem] overflow-hidden"
        >


          {/* Header with Merchant Info */}
          <div className="p-6 text-center border-b">
            <div className="w-16 h-16 bg-green-600 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold mb-2">
              {state.name?.charAt(0) || "F"}
            </div>
            <h2 className="font-bold text-gray-800 text-lg uppercase tracking-wider">
              Paying {state.farmer_id || "Agri Farmer"}
            </h2>
            <p className="text-gray-500 text-sm font-medium">Verified Merchant 🛡️</p>
            <div className="mt-4 text-4xl font-black text-gray-900">
              ₹{total}
            </div>
          </div>

          {/* Payment Input Area */}
          <div className="p-8 flex-grow space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Transfer to UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@bank"
                className="w-full border-b-2 border-gray-200 focus:border-blue-500 p-3 text-lg outline-none transition-colors"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3">
              <div className="bg-green-600 text-white p-2 rounded-full text-xs">🔒</div>
              <p className="text-[10px] text-blue-800 font-semibold leading-tight">
                Your payment is secured by AgriConnect Escrow. Money will be released to the farmer only after you confirm delivery.
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 bg-gray-50 border-t">
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? "Connecting to Bank..." : `Proceed to Pay ₹${total}
`}
            </button>

            <div className="flex justify-center items-center gap-4 mt-4 opacity-40">
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-4" />
              <span className="text-[10px] font-bold">POWERED BY NPCI</span>
            </div>
          </div>

          {/* Processing Overlay */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-10 text-center"
              >
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-gray-800">Processing Payment</h3>
                <p className="text-gray-500 mt-2">Please do not press back or close the app...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
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
                Funds secured via UPI & held in escrow
              </p>

              <div className="bg-green-50 rounded-xl py-3 mb-6 font-black text-green-700 text-lg">
                ₹{total}

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