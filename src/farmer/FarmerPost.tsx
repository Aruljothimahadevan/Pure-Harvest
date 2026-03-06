import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FarmerNavBar from "./FarmerTopNavBar";


const districts = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
  "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram",
  "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
  "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
  "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
  "Tirupattur", "Tiruppur", "Tiruvannamalai",
  "Tiruvarur", "Vellore", "Villupuram", "Virudhunagar"
].sort((a, b) => a.localeCompare(b));

const commodityData: Record<string, string[]> = {
  fruits: [
    "Mango", "Banana", "Apple", "Orange", "Papaya", "Guava",
    "Grapes", "Pineapple", "Watermelon", "Pomegranate",
    "Jackfruit", "Custard Apple", "Sapota / Chikoo",
    "Jamun", "Amla", "Ber", "Bael"
  ].sort((a, b) => a.localeCompare(b)),

  vegetables: [
    "Potato", "Carrot", "Radish", "Beetroot", "Sweet Potato",
    "Turnip", "Onion", "Garlic", "Ginger", "Lotus Stem",
    "Sugarcane", "Cauliflower", "Broccoli", "Banana Flower",
    "Tomato", "Brinjal / Eggplant", "Okra / Ladyfinger",
    "Bottle Gourd", "Ridge Gourd", "Bitter Gourd",
    "Pumpkin", "Cucumber", "Capsicum", "Beans"
  ].sort((a, b) => a.localeCompare(b)),

  leafy: [
    "Spinach", "Fenugreek Leaves", "Mustard Greens",
    "Coriander Leaves", "Mint", "Curry Leaves",
    "Amaranth", "Drumstick Leaves", "Colocasia Leaves", "Dill Leaves"
  ].sort((a, b) => a.localeCompare(b)),

  pulses: [
    "Toor Dal", "Moong Dal", "Masoor Dal",
    "Chana Dal", "Urad Dal", "Rajma",
    "Chickpeas", "Cowpea"
  ].sort((a, b) => a.localeCompare(b)),

  cereals: [
    "Rice", "Wheat", "Maize", "Jowar",
    "Bajra", "Ragi", "Barley"
  ].sort((a, b) => a.localeCompare(b)),

  nuts: [
    "Groundnut", "Cashew", "Almond", "Walnut",
    "Sesame Seeds", "Flax Seeds", "Pumpkin Seeds"
  ].sort((a, b) => a.localeCompare(b)),
};


export default function FarmerPost() {
  const [step, setStep] = useState(1);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [commodity, setCommodity] = useState("");
  const [district, setDistrict] = useState("");
  const [aiPrice, setAiPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<{ day: string, price: number }[]>([]);
  const [bestMandi, setBestMandi] = useState<{ district: string, price: number } | null>(null);
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [todayPrice, setTodayPrice] = useState<number | null>(null);
  const [demandLevel, setDemandLevel] = useState<string>("");
  const [smartSuggestion, setSmartSuggestion] = useState<{
    type: "sell" | "wait" | "fast" | null;
    message: string;
    extra?: string;
  }>({ type: null, message: "" });
  const commodityRef = useRef<HTMLSelectElement | null>(null);

  /* Auto-focus commodity after category selection */
  useEffect(() => {
    if (category && commodityRef.current) {
      commodityRef.current.focus();
    }
  }, [category]);
  /* Auto-set minimum quantity when Step 3 opens */
  useEffect(() => {
    if (step === 3) {
      setQuantity(getMinQuantity());
    }
  }, [step, category]);

  useEffect(() => {
    if (step === 3 && aiPrice !== null) {
      setPrice(String(aiPrice));
    }
  }, [step, aiPrice]);
  useEffect(() => {
    const farmerId = sessionStorage.getItem("farmerId");
    if (!farmerId) return;

    fetch(`http://localhost:5000/api/farmer/profile/${farmerId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.district) return;

        const matchedDistrict = districts.find(
          d => d.toLowerCase() === data.district.toLowerCase()
        );

        if (matchedDistrict) {
          setDistrict(matchedDistrict);
        }
        setProfileLoaded(true);
      });
  }, []);
  const handlePostCrop = async () => {
    const farmerId = sessionStorage.getItem("farmerId");

    if (!farmerId) {
      alert("Login again");
      return;
    }

    await fetch("http://127.0.0.1:5000/api/crop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmer_id: farmerId,
        name: commodity,
        quantity,
        price: Number(price),
        photos
      })
    });
    setPhotos([]);
    setShowSuccess(true);
    setConfetti(true);
    stopCamera();
    setShowCamera(false);
    setTimeout(() => setConfetti(false), 2500);
  };
  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
  }, [showCamera]);
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };
  const calculateSmartSuggestion = () => {
    if (!todayPrice || forecast.length === 0) return;

    const futurePrices = forecast.map(f => f.price);
    const maxFuturePrice = Math.max(...futurePrices);
    const bestDayIndex = futurePrices.indexOf(maxFuturePrice) + 1;

    const priceDifference = maxFuturePrice - todayPrice;

    // 🔥 RULE 1 — WAIT (profit possible)
    if (priceDifference > todayPrice * 0.03) {
      setSmartSuggestion({
        type: "wait",
        message: `Hold for ${bestDayIndex} day(s)`,
        extra: `Price may rise to ₹${Math.round(maxFuturePrice)}/kg (+₹${Math.round(priceDifference)})`
      });
      return;
    }

    // 🔥 RULE 2 — SELL NOW (high demand)
    if (demandLevel === "high") {
      setSmartSuggestion({
        type: "sell",
        message: "Best time to sell today",
        extra: "Strong buyer demand detected"
      });
      return;
    }

    // 🔥 RULE 3 — SELL FAST (low demand + no growth)
    if (demandLevel === "low") {
      setSmartSuggestion({
        type: "fast",
        message: "Sell quickly to avoid loss",
        extra: "Oversupply risk in market"
      });
      return;
    }

    // Default
    setSmartSuggestion({
      type: "sell",
      message: "Safe to sell today",
      extra: "Market stable"
    });
  };
  const fetchForecast = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/ai/hybrid_5day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district, commodity })
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setForecast(
        data.next_5_days_prediction.map((p: number, i: number) => ({
          day: `D${i + 1}`,
          price: p
        }))
      );

    } catch (err) {
      console.error("Forecast error:", err);
    }
  };
  useEffect(() => {
    if (todayPrice !== null && forecast.length > 0) {
      calculateSmartSuggestion();
    }
  }, [todayPrice, forecast, demandLevel]);

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      navigate(-1); // leave FarmerPost page
    }
  };

  const fetchDynamicPrice = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://127.0.0.1:5000/api/ai/dynamic-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district, commodity })
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        setTodayPrice(null);
        setAiPrice(null);
        return;
      }

      setAiPrice(Math.round(data.final_price));

      // fallback safe
      setTodayPrice(
        data.base_price ? Math.round(data.base_price) : Math.round(data.final_price)
      );

      setDemandLevel(data.trend || "low");

    } catch (err) {
      console.error(err);
      alert("AI service failed");
    } finally {
      setLoading(false);
    }
  };


  const getMinQuantity = () => {
    if (category === "fruits" || category === "vegetables") return 25;
    if (category === "cereals" || category === "pulses") return 100;
    if (category === "nuts") return 50;

    return 1;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

    } catch {
      alert("Camera permission required");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx?.drawImage(video, 0, 0);

    const now = new Date();

    const watermark =
      `${district} | ${now.toLocaleDateString()} | Farmer ID: ${sessionStorage.getItem("farmerId")}`;

    ctx!.fillStyle = "rgba(0,0,0,0.6)";
    ctx!.fillRect(0, canvas.height - 40, canvas.width, 40);

    ctx!.fillStyle = "white";
    ctx!.font = "16px Arial";
    ctx!.fillText(watermark, 10, canvas.height - 15);

    const image = canvas.toDataURL("image/jpeg");

    if (photos.length >= 3) {
      alert("You already captured 3 photos");
      return;
    }

    setPhotos([...photos, image]);
  };

  const getCategoryLabel = () => {
    if (category === "fruits") return "Fruit";
    if (category === "vegetables") return "Vegetable";
    if (category === "leafy") return "Leafy Green";
    if (category === "pulses") return "Pulse";
    if (category === "cereals") return "Grain";
    if (category === "nuts") return "Nut / Storage Crop";

    return "Commodity";
  };

  const maxPrice =
    forecast.length > 0
      ? Math.max(...forecast.map(f => f.price))
      : 1;
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-100">
      <FarmerNavBar />
      {/* Header */}
      <header className="sticky top-20 z-30 bg-green-700 text-white py-6 shadow-lg">
        <h1 className="text-3xl font-bold text-center">
          🌾 Farmer Price Control
        </h1>
        <p className="text-center text-green-100">
          Transparent pricing • You stay in control
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 pb-28">
        {/* Step Indicator */}
        <div className="flex justify-center gap-4 mb-10">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              layout
              transition={{ duration: 0.3 }}
              className={`px-6 py-2 rounded-full text-sm font-semibold ${step === s
                ? "bg-green-600 text-white scale-105 shadow-md"
                : "bg-white text-gray-600"
                }`}
            >
              Step {s}
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ------------------------------- STEP 1 ------------------------------ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div>
                <label className="text-lg font-semibold">State</label>
                <input
                  disabled
                  value="Tamil Nadu"
                  className="w-full mt-2 p-4 rounded-xl bg-gray-100 border"
                />
              </div>

              <div>
                <label className="text-lg font-semibold">District</label>
                {!profileLoaded ? (
                  <div className="w-full mt-2 p-4 rounded-xl bg-gray-100 border animate-pulse">
                    Loading district...
                  </div>
                ) : (
                  <select
                    className="w-full mt-2 p-4 rounded-xl border"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  >
                    <option value="">Select district</option>
                    {districts.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Category & Commodity */}
              <motion.div
                layout
                className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <motion.div
                  layout
                  className={category ? "md:col-span-1" : "md:col-span-2"}
                >
                  <label className="text-lg font-semibold">
                    Commodity Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setCommodity("");
                    }}
                    className="w-full mt-2 p-4 rounded-xl border"
                  >
                    <option value="">Select Category</option>
                    <option value="fruits">Fruits</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="leafy">Leafy Greens</option>
                    <option value="pulses">Pulses / Legumes</option>
                    <option value="cereals">Cereals & Millets</option>
                    <option value="nuts">Nuts & Seeds</option>
                  </select>
                </motion.div>

                <AnimatePresence>
                  {category && (
                    <motion.div
                      key="commodity"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <label className="text-lg font-semibold">
                        Commodity
                      </label>
                      <select
                        ref={commodityRef}
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        className="w-full mt-2 p-4 rounded-xl border"
                      >
                        <option value="">Select Commodity</option>
                        {commodityData[category].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              <div className="md:col-span-2 flex justify-center gap-6 mt-6">

                {/* CONTINUE */}
                <div className="md:col-span-2 flex justify-center mt-6">

                  <button
                    onClick={async () => {
                      if (!district || !commodity) {
                        alert("Select district and commodity");
                        return;
                      }
                      setStep(2);
                      fetchDynamicPrice();
                      fetchForecast();
                    }}
                    className="px-10 py-4 rounded-full bg-green-600 text-white text-lg font-bold hover:scale-105 transition"
                  >
                    Continue →
                  </button>

                </div>
              </div>
            </motion.div>
          )}

          {/* ------------------------------- STEP 2 ------------------------------ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* TODAY MARKET PRICE + DEMAND */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br from-orange-400 to-red-500 flex flex-col justify-center items-center text-center"
              >
                <p className="text-lg">📊 Today Market Price</p>

                <h2 className="text-4xl font-bold mt-2">
                  {todayPrice !== null ? `₹${todayPrice}/kg` : "--"}                </h2>

                <p className={`mt-2 px-4 py-1 rounded-full text-sm font-bold ${demandLevel === "high"
                  ? "bg-red-600"
                  : demandLevel === "medium"
                    ? "bg-yellow-500 text-black"
                    : "bg-green-600"
                  }`}>
                  Demand: {demandLevel.toUpperCase()}
                </p>
              </motion.div>

              {/* AI PREDICTED (UNCHANGED SIZE) */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col justify-center items-center text-center
"
              >
                <p className="text-lg">🤖 AI Predicted</p>
                <h2 className="text-4xl font-bold mt-2">
                  {aiPrice !== null ? `₹${aiPrice}/kg` : "--"}</h2>
                {smartSuggestion.type && (
                  <div className="mt-4 text-center blink-soft">

                    <p className="text-sm font-semibold tracking-wide opacity-90">
                      🧠 Smart Suggestion
                    </p>

                    <p className={`text-lg font-bold mt-1 ${smartSuggestion.type === "wait"
                      ? "text-yellow-200"
                      : smartSuggestion.type === "sell"
                        ? "text-green-200"
                        : "text-red-200"
                      }`}>
                      {smartSuggestion.message}
                    </p>

                    {smartSuggestion.extra && (
                      <p className="text-sm opacity-80 mt-1">
                        {smartSuggestion.extra}
                      </p>
                    )}

                  </div>
                )}
              </motion.div>

              {/* NEXT 7 DAYS PRICE VISUAL */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br from-purple-400 to-purple-600 flex flex-col justify-center items-center text-center"
              >
                <p className="text-lg mb-2">📆 Next 5 Days Price</p>

                {forecast.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm mb-1 w-full">
                    <span className="w-6">D{i + 1}</span>

                    <div className="flex-1 bg-white/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(f.price / maxPrice) * 100}%` }}
                      />
                    </div>

                    <span>₹{Math.round(f.price)}</span>
                  </div>
                ))}
              </motion.div>

              {/* Buttons remain same */}
              <div className="md:col-span-3 flex justify-center gap-6 mt-6">

                <button
                  onClick={handleBack}
                  className="px-10 py-4 rounded-full border-2 border-green-600 text-green-700 font-bold hover:scale-105 transition-transform duration-200"
                >
                  ← Back
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="px-10 py-4 rounded-full bg-green-700 text-white text-lg font-bold hover:scale-105 transition"
                >
                  Choose Your Price →
                </button>

              </div>

            </motion.div>
          )}


          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl p-10 text-center"
            >
              <div className="flex flex-col items-center gap-4">

                {/* COMMODITY NAME */}
                <h2 className="text-3xl font-bold text-green-700 w-44 text-center">
                  🌾 {commodity}
                </h2>

                {/* PRICE + QUANTITY */}
                <div className="flex flex-col items-center gap-6 mt-4 ml-6">

                  <div className="flex items-center gap-2">
                    <input
                      value={price}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") return setPrice("");
                        if (!/^\d*\.?\d*$/.test(value)) return;
                        setPrice(value);
                      }}
                      className="w-44 text-center text-4xl font-bold border-2 border-green-600 rounded-xl p-3"
                    />
                    <span className="text-2xl font-bold text-gray-700">/ kg</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={quantity}
                      onChange={(e) => {
                        const num = Number(e.target.value || 0);
                        if (isNaN(num)) return;
                        setQuantity(num);
                      }}
                      className="w-44 text-center text-2xl font-bold border-2 border-green-600 rounded-xl p-3"
                    />
                    <span className="text-xl font-bold text-gray-700">kg</span>
                  </div>

                  <p
                    className={`text-sm font-semibold ${quantity < getMinQuantity()
                      ? "text-red-600 animate-[blink_0.4s_infinite]"
                      : "text-gray-500"
                      }`}
                  >
                    Minimum: {getMinQuantity()} kg for this {getCategoryLabel()}
                  </p>

                </div>

                {/* TOTAL */}
                <p className="mt-4 text-2xl font-bold text-green-700">
                  Total Value: ₹{Math.round(Number(price) * quantity)}
                </p>

                {/* ACTION BUTTONS */}
                <div className="flex gap-6 mt-6 justify-center">

                  <button
                    onClick={handleBack}
                    className="px-10 py-4 rounded-full border-2 border-green-600 text-green-700 font-bold
hover:scale-105 transition"                 >
                    ← Back
                  </button>

                  <button
                    disabled={quantity < getMinQuantity()}
                    onClick={() => setShowCamera(true)}
                    className={`px-12 py-4 rounded-full text-xl font-bold ${quantity < getMinQuantity()
                      ? "bg-gray-300 text-gray-500"
                      : "bg-green-600 text-white"
                      }`}
                  >
                    Post Crop 🚀
                  </button>

                </div>

              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </main>
      {confetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
          {[...Array(80)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -20,
                x: Math.random() * window.innerWidth,
                opacity: 1
              }}
              animate={{
                y: window.innerHeight + 100,
                rotate: Math.random() * 360
              }}
              transition={{
                duration: 2 + Math.random(),
                ease: "easeOut"
              }}
              className="w-2 h-2 bg-green-500 absolute rounded-full"
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-3xl p-8 text-center shadow-2xl w-[360px]"
            >
              <h2 className="text-3xl font-bold text-green-700 mb-2">
                🎉 Posted Successfully!
              </h2>

              {/* Summary Card */}
              <div className="bg-green-50 rounded-xl p-4 my-4 text-left">
                <p><b>Crop:</b> {commodity}</p>
                <p><b>Quantity:</b> {quantity} kg</p>
                <p><b>Price:</b> ₹{price} / kg</p>
                <p className="text-green-700 font-bold mt-1">
                  Total: ₹{Math.round(Number(price) * quantity)}
                </p>
              </div>

              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setStep(1);
                    setCommodity("");
                    setCategory("");
                    setQuantity(0);
                    setPrice("");
                    setPhotos([]);
                  }}
                  className="px-5 py-2 rounded-full border border-green-600 text-green-700 font-semibold hover:bg-green-50"
                >
                  ➕ Post Another
                </button>

                <button
                  onClick={() => navigate("/my-crops")}
                  className="px-6 py-2 rounded-full bg-green-600 text-white font-bold hover:bg-green-700"
                >
                  📦 My Crops
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          >

            <div className="bg-white rounded-3xl p-6 w-[700px] max-h-[90vh] overflow-y-auto text-center">

              <h2 className="text-2xl font-bold text-green-700 mb-4">
                📸 Capture Crop Photos
              </h2>

              <p className="text-gray-600 mb-3">
                Minimum 3 real crop photos required ({photos.length}/3)
              </p>

              <video
                ref={videoRef}
                autoPlay
                className="w-full max-h-[350px] object-cover rounded-xl"
              />

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex justify-center gap-4 mt-4">

                <button
                  onClick={capturePhoto}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl"
                >
                  Capture
                </button>

                <button
                  onClick={() => {
                    stopCamera();
                    setShowCamera(false);
                  }}
                  className="px-6 py-3 border rounded-xl"
                >
                  Cancel
                </button>

              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} className="rounded-lg" />

                    <button
                      onClick={() =>
                        setPhotos(photos.filter((_, index) => index !== i))
                      }
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full px-2"
                    >
                      ✕
                    </button>

                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 bg-white pt-4">

                <button
                  disabled={photos.length < 3}
                  onClick={handlePostCrop}
                  className={`mt-6 px-10 py-3 rounded-xl font-bold
${photos.length < 3 ? "bg-gray-300" : "bg-green-600 text-white"}
`}
                >
                  Post Crop
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}