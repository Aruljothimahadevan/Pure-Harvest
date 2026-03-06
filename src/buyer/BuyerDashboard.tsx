import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BuyerTopNavBar from "./BuyerTopNavBar";
import { createPortal } from "react-dom";
/* --- Mock Data --- */

type Category = "All" | "Vegetables" | "Fruits" | "Grains" | "Pulses"

const categories: { id: number; name: Category; icon: string }[] = [
    { id: 1, name: "All", icon: "🌱" },
    { id: 2, name: "Vegetables", icon: "🥕" },
    { id: 3, name: "Fruits", icon: "🍎" },
    { id: 4, name: "Grains", icon: "🌾" },
    { id: 5, name: "Pulses", icon: "🫘" },
];
const commodityData: Record<string, string[]> = {
    fruits: [
        "Mango", "Banana", "Apple", "Orange", "Papaya", "Guava",
        "Grapes", "Pineapple", "Watermelon", "Pomegranate",
        "Jackfruit", "Custard Apple", "Sapota / Chikoo",
        "Jamun", "Amla", "Ber", "Bael"
    ],
    vegetables: [
        "Potato", "Carrot", "Radish", "Beetroot", "Sweet Potato",
        "Turnip", "Onion", "Garlic", "Ginger", "Lotus Stem",
        "Sugarcane", "Cauliflower", "Broccoli", "Banana Flower",
        "Tomato", "Brinjal / Eggplant", "Okra / Ladyfinger",
        "Bottle Gourd", "Ridge Gourd", "Bitter Gourd",
        "Pumpkin", "Cucumber", "Capsicum"
    ],
    leafy: [
        "Spinach", "Fenugreek Leaves", "Mustard Greens",
        "Coriander Leaves", "Mint", "Curry Leaves",
        "Amaranth", "Drumstick Leaves", "Colocasia Leaves", "Dill Leaves"
    ],
    pulses: [
        "Toor Dal", "Moong Dal", "Masoor Dal",
        "Chana Dal", "Urad Dal", "Rajma",
        "Chickpeas", "Cowpea"
    ],
    cereals: [
        "Rice", "Wheat", "Maize", "Jowar",
        "Bajra", "Ragi", "Barley"
    ],
    nuts: [
        "Groundnut", "Cashew", "Almond", "Walnut",
        "Sesame Seeds", "Flax Seeds", "Pumpkin Seeds"
    ]
};

const categoryMap: Record<Exclude<Category, "All">, string[]> = {
    Vegetables: commodityData.vegetables,
    Fruits: commodityData.fruits,
    Grains: commodityData.cereals,
    Pulses: commodityData.pulses
};


function highlightText(text: string, highlight: string) {
    if (!highlight) return text;

    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 px-1 rounded">
                {part}
            </span>
        ) : (
            part
        )
    );
}

function CropImageSlider({ photos }: { photos?: string[] }) {
    const safePhotos = Array.isArray(photos) ? photos : [];

    const [index, setIndex] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const [, setZoom] = useState(1);
    useEffect(() => {
        if (safePhotos.length === 0 || showPopup) return;

        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % safePhotos.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [safePhotos, showPopup]);

    if (safePhotos.length === 0) {
        return (
            <div className="w-40 h-40 mx-auto bg-green-50 rounded-2xl flex items-center justify-center text-5xl">
                🌾
            </div>
        );
    }

    return (
        <>
            {/* IMAGE */}
            <div className="w-40 mx-auto">
                <div
                    className="w-40 h-40 overflow-hidden rounded-2xl bg-gray-100 cursor-pointer"
                    onClick={() => {
                        setZoom(1);
                        setShowPopup(true);
                    }}
                >
                    <img
                        src={safePhotos[index]}
                        className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                    />
                </div>

                {/* DOT INDICATOR */}
                <div className="flex justify-center gap-1 mt-2">
                    {safePhotos.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 w-2 rounded-full transition-all ${i === index ? "bg-green-600 w-4" : "bg-gray-300"
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* FULLSCREEN IMAGE VIEWER */}
            {/* FULLSCREEN IMAGE VIEWER */}
            {showPopup &&
                createPortal(
                    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center">

                        {/* Stylish Close Button */}
                        <button
                            onClick={() => setShowPopup(false)}
                            className="absolute top-8 right-8 w-14 h-14 flex items-center justify-center
    rounded-full bg-white text-gray-800 text-3xl font-bold
    shadow-2xl hover:bg-red-500 hover:text-white hover:scale-110 transition-all duration-300"
                        >
                            ×
                        </button>

                        {/* IMAGE + CAROUSEL */}
                        <div className="flex flex-col items-center gap-6">

                           <img
    src={safePhotos[index]}
    className="h-[78vh] w-auto object-contain rounded-xl shadow-2xl"
/>
                            {/* THUMBNAIL CAROUSEL */}
                            <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">

                                {safePhotos.map((photo, i) => (
                                    <img
                                        key={i}
                                        src={photo}
                                        onClick={() => setIndex(i)}
                                        className={`h-20 w-20 object-cover rounded-lg cursor-pointer border-2 transition 
                ${i === index ? "border-green-500 scale-110" : "border-white/30"}`}
                                    />
                                ))}

                            </div>

                        </div>

                    </div>,
                    document.body
                )
            }
        </>
    );

}

export default function BuyerDashboard() {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showQtyModal, setShowQtyModal] = useState(false);
    const [buyQuantity, setBuyQuantity] = useState(0);
    const [showAIModal, setShowAIModal] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState<any>(null);
    const [aiResult, setAiResult] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Category>("All");
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastOrder] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [showSort, setShowSort] = useState(false);
    const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
    const [buyerDistrict, setBuyerDistrict] = useState("");
    const [availableCrops, setAvailableCrops] = useState<any[]>([]);
    const [userName, setUserName] = useState("");
    const [sortField, setSortField] = useState<"name" | "price" | "quantity" | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    useEffect(() => {
        const buyerId = sessionStorage.getItem("buyerId");

        if (!buyerId) return;

        fetch(`https://pure-harvest.onrender.com/api/buyer/profile/${buyerId}`)
            .then(res => res.json())
            .then(data => {
                setUserName(data.name);
                setBuyerDistrict(data.district);
            });
    }, []);


    const fetchCrops = async () => {
        const buyerId = sessionStorage.getItem("buyerId");
        if (!buyerId) return;

        const favRes = await fetch(`https://pure-harvest.onrender.com/api/buyer/favorites/${buyerId}`);
        const favData = await favRes.json();
        setFavoriteIds(favData.map((c: any) => Number(c.id)));

        const cropRes = await fetch(`https://pure-harvest.onrender.com/api/ai/recommended-crops/${buyerId}`);
        const cropData = await cropRes.json();

        setAvailableCrops(cropData);
        setLoading(false);
    };

    useEffect(() => {
        fetchCrops();
    }, []);

    const getMinQuantity = (cropName: string) => {
        const lower = cropName.toLowerCase();

        if (commodityData.fruits.some(c => c.toLowerCase() === lower)) return 25;
        if (commodityData.vegetables.some(c => c.toLowerCase() === lower)) return 25;
        if (commodityData.cereals.some(c => c.toLowerCase() === lower)) return 100;
        if (commodityData.pulses.some(c => c.toLowerCase() === lower)) return 100;
        if (commodityData.nuts.some(c => c.toLowerCase() === lower)) return 50;

        return 1;
    };

    const isInvalidQty = selectedCrop
        ? buyQuantity < selectedCrop.minQty || buyQuantity > selectedCrop.quantity
        : false;

    const handleBuy = async (crop: any) => {
        setSelectedCrop(crop);
        setShowAIModal(true);
        setAiLoading(true);
        const buyerId = sessionStorage.getItem("buyerId");

        if (buyerId) {
            await fetch("https://pure-harvest.onrender.com/api/search-log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    buyer_id: buyerId,
                    commodity: crop.name.toLowerCase()
                })
            });
        }
        const res = await fetch("https://pure-harvest.onrender.com/api/ai/dynamic-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                commodity: crop.name,
                district: buyerDistrict
            })
        });

        const data = await res.json();

        const seller = crop.price;
        const market = data.base_price;

        let priceVerdict = "fair";

        if (seller < market * 0.95) priceVerdict = "cheap";
        else if (seller > market * 1.05) priceVerdict = "high";

        let buyAdvice = "neutral";
        if (data.trend === "high") buyAdvice = "buy";
        if (data.trend === "low") buyAdvice = "wait";

        setAiResult({
            ...data,
            priceVerdict,
            buyAdvice
        });

        setAiLoading(false);
    };

    return (
        <>
            <BuyerTopNavBar />

            {/* Push content below fixed navbar */}
            <div className="min-h-screen bg-gray-50 flex pt-24">
                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8">
                    {/* Header */}
                    <header className="flex flex-col gap-4 md:grid md:grid-cols-3 md:items-center mb-8">
                        {/* LEFT — Welcome */}
                        <div className="text-left">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Welcome, {userName} 👋
                            </h1>
                            <p className="text-gray-500 text-sm">
                                Find the freshest produce near your location.
                            </p>
                        </div>

                        {/* CENTER — ANIMATED SEARCH BAR */}
                        <div className="w-full md:flex md:justify-center">
                            <motion.div
                                whileHover={{ scale: 1.03 }}
                                transition={{ type: "spring", stiffness: 200 }}
                                className="relative w-full max-w-[1300px]"
                            >

                                {/* Animated Gradient Border */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 blur opacity-20 group-hover:opacity-40 transition duration-500"></div>

                                <div className="relative">

                                    {/* Floating Search Icon */}
                                    <motion.span
                                        animate={{ y: [0, -3, 0] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-2xl"
                                    >
                                        🔍
                                    </motion.span>

                                    <input
                                        type="text"
                                        value={searchTerm}
                                        placeholder="Search fresh crops near you..."
                                        onChange={async (e) => {
                                            const value = e.target.value;
                                            setSearchTerm(value);

                                            if (!value.trim()) {
                                                setSuggestions([]);
                                                return;
                                            }

                                            const all = Object.values(commodityData).flat();
                                            const matched = all.filter(c =>
                                                c.toLowerCase().includes(value.toLowerCase())
                                            );

                                            setSuggestions(matched.slice(0, 5));


                                        }}
                                        className="
          w-full
          pl-16 pr-6 py-5
          text-lg font-medium
          rounded-full
          border border-gray-200
          bg-white/90 backdrop-blur
          shadow-xl
          focus:ring-4 focus:ring-green-300
          focus:shadow-2xl
          hover:shadow-2xl
          transition-all duration-300
          outline-none
        "
                                    />

                                    {/* Suggestions Dropdown */}
                                    {suggestions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="absolute w-full mt-3 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden"
                                        >
                                            {suggestions.map(item => (
                                                <div
                                                    key={item}
                                                    onClick={async () => {
                                                        setSearchTerm(item);
                                                        setSuggestions([]);

                                                        const buyerId = sessionStorage.getItem("buyerId");

                                                        if (buyerId) {
                                                            await fetch("https://pure-harvest.onrender.com/api/search-log", {
                                                                method: "POST",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({
                                                                    buyer_id: buyerId,
                                                                    commodity: item.toLowerCase()
                                                                })
                                                            });
                                                        }
                                                    }}
                                                    className="
                px-5 py-3
                hover:bg-green-50
                hover:pl-8
                transition-all duration-300
                cursor-pointer
                font-medium
              "
                                                >
                                                    {item}
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}

                                </div>
                            </motion.div>
                        </div>

                        {/* RIGHT — SORT BUTTON */}
                        <div className="w-full flex justify-start md:justify-end relative">

                            <button
                                onClick={() => setShowSort(!showSort)}
                                className="flex items-center gap-2 px-6 py-3
      bg-gradient-to-r from-green-600 to-emerald-500
      text-white rounded-2xl shadow-lg
      hover:scale-105 transition font-bold"
                            >
                                🔃 {
                                    !sortField
                                        ? "Sort Crops"
                                        : sortField === "name"
                                            ? `Name (${sortDirection === "asc" ? "A → Z" : "Z → A"})`
                                            : sortField === "price"
                                                ? `Price (${sortDirection === "asc" ? "Low → High" : "High → Low"})`
                                                : `Quantity (${sortDirection === "asc" ? "Low → High" : "High → Low"})`
                                }                            </button>

                            {showSort && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute right-0 top-full mt-3 w-52 bg-white rounded-2xl shadow-2xl border overflow-hidden z-20"
                                >
                                    {[
                                        {
                                            label:
                                                sortField === "name"
                                                    ? `Name (${sortDirection === "asc" ? "Z → A" : "A → Z"})`
                                                    : "Name (A → Z)",
                                            value: "name" as const
                                        },
                                        {
                                            label:
                                                sortField === "price"
                                                    ? `Price (${sortDirection === "asc" ? "High → Low" : "Low → High"})`
                                                    : "Price (Low → High)",
                                            value: "price" as const
                                        },
                                        {
                                            label:
                                                sortField === "quantity"
                                                    ? `Quantity (${sortDirection === "asc" ? "High → Low" : "Low → High"})`
                                                    : "Quantity (Low → High)",
                                            value: "quantity" as const
                                        }
                                    ].map(item => (
                                        <div
                                            key={item.value}
                                            onClick={() => {
                                                if (sortField === item.value) {
                                                    // If clicking same field → toggle direction
                                                    setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
                                                } else {
                                                    // New field → start with ascending
                                                    setSortField(item.value);
                                                    setSortDirection("asc");
                                                }

                                                setShowSort(false);
                                            }}
                                            className="px-5 py-3 hover:bg-green-50 cursor-pointer font-semibold text-sm"
                                        >
                                            {item.label}
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                        </div>

                    </header>

                    {/* Category Selection */}
                    <div className="grid grid-cols-5 gap-3 w-full pb-4">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.name)}
                                className={`w-full flex justify-center items-center gap-2 py-3 rounded-2xl font-semibold    transition-all whitespace-nowrap
                                ${activeTab === cat.name
                                        ? "bg-green-600 text-white shadow-md"
                                        : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"}`}
                            >
                                <span>{cat.icon}</span> {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Grid Layout */}
                    <div className="grid grid-cols-1 gap-8 mt-6">

                        {/* Listings Grid */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800">Fresh Stock Near You</h3>



                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loading && (
                                    <p className="text-center col-span-2">Loading crops...</p>
                                )}

                                {!loading && availableCrops.length === 0 && (
                                    <p className="text-center col-span-2">No crops available</p>
                                )}

                                {availableCrops
                                    .filter((crop) => {

                                        const categoryMatch =
                                            activeTab === "All"
                                                ? true
                                                : categoryMap[activeTab].some(item =>
                                                    crop.name.toLowerCase().includes(item.toLowerCase())
                                                );

                                        const searchMatch = crop.name
                                            .toLowerCase()
                                            .includes(searchTerm.toLowerCase());

                                        return categoryMatch && searchMatch;
                                    })
                                    .sort((a, b) => {
                                        if (!sortField) return 0;

                                        let result = 0;

                                        if (sortField === "name") {
                                            result = a.name.localeCompare(b.name);
                                        }

                                        if (sortField === "price") {
                                            result = a.price - b.price;
                                        }

                                        if (sortField === "quantity") {
                                            result = a.quantity - b.quantity;
                                        }

                                        return sortDirection === "asc" ? result : -result;
                                    })
                                    .map((crop) => (


                                        <motion.div
                                            key={crop.id}
                                            whileHover={{
                                                y: -8,
                                                boxShadow: "0 20px 25px rgba(0,0,0,0.1)"
                                            }}
                                            transition={{ type: "spring", stiffness: 260 }}
                                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative text-center"
                                        >
                                            {/* Favorite toggle */}
                                            <button
                                                onClick={async () => {
                                                    const buyerId = sessionStorage.getItem("buyerId");
                                                    if (!buyerId) return;

                                                    const cropId = Number(crop.id);
                                                    const isFav = favoriteIds.includes(cropId);

                                                    if (isFav) {
                                                        await fetch(`https://pure-harvest.onrender.com/api/buyer/favorites/${cropId}/${buyerId}`, {
                                                            method: "DELETE"
                                                        });
                                                        setFavoriteIds(prev => prev.filter(id => id !== cropId));
                                                    } else {
                                                        await fetch("https://pure-harvest.onrender.com/api/buyer/favorites", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({
                                                                buyer_id: buyerId,
                                                                crop_id: cropId
                                                            })
                                                        });
                                                        setFavoriteIds(prev => [...prev, cropId]);
                                                    }
                                                }}
                                                className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm transition
    ${favoriteIds.includes(crop.id)
                                                        ? "border-red-400 text-red-500 bg-red-50"
                                                        : "border-gray-300 text-gray-500 bg-white"
                                                    }
  `}
                                            >
                                                <span>
                                                    {favoriteIds.includes(crop.id) ? "Remove" : "Add to"}
                                                </span>

                                                <span className="text-xl">
                                                    {favoriteIds.includes(crop.id) ? "💔" : "❤️"}
                                                </span>
                                            </button>



                                            {/* Crop Images */}
                                            <div className="flex justify-center mb-4">
                                                <CropImageSlider photos={crop.photos} />
                                            </div>

                                            {/* Crop Name */}
                                            <h4 className="text-xl font-black text-gray-800 mb-1">
                                                {highlightText(crop.name, searchTerm)}
                                            </h4>

                                            {/* Farmer */}
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
                                                    Available Stock Value: ₹{(crop.price * crop.quantity).toFixed(2)}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    const requiredMin = getMinQuantity(crop.name);

                                                    // 🔥 If stock is less than minimum → allow full stock
                                                    const finalMin = Math.min(requiredMin, crop.quantity);

                                                    setSelectedCrop({ ...crop, minQty: finalMin });
                                                    setBuyQuantity(finalMin);
                                                    setShowQtyModal(true);
                                                }}
                                                className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition"
                                            >
                                                Buy Now
                                            </button>
                                        </motion.div>


                                    ))}
                            </div>
                        </div>

                    </div>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.7, y: 60 }}
                                animate={{ scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 260 }}
                                className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full relative overflow-hidden"
                            >

                                {/* 🎉 Confetti illusion */}
                                <div className="absolute inset-0 pointer-events-none animate-pulse bg-gradient-to-br from-green-100 via-white to-yellow-100 opacity-60" />

                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">🎉</div>

                                    <h3 className="text-2xl font-black text-gray-800 mb-2">
                                        Order Successful!
                                    </h3>

                                    <p className="text-gray-500 mb-6">
                                        Your fresh crop is on the way 🚜
                                    </p>

                                    <div className="bg-green-50 rounded-2xl p-4 mb-6 text-left text-sm">
                                        <p><strong>Crop:</strong> {lastOrder?.name}</p>
                                        <p><strong>Qty:</strong> {lastOrder?.quantity} kg</p>
                                        <p><strong>Price:</strong> ₹{lastOrder?.price}</p>
                                    </div>

                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={() => setShowSuccess(false)}
                                            className="px-6 py-3 rounded-full bg-gray-100 font-bold hover:bg-gray-200"
                                        >
                                            Close
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowSuccess(false);
                                                navigate("/buyer-orders");
                                            }}
                                            className="px-6 py-3 rounded-full bg-green-600 text-white font-bold hover:bg-green-700"
                                        >
                                            View Orders 📦
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                    {showQtyModal && selectedCrop && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-2xl w-80 text-center">

                                <h3 className="text-xl font-bold mb-2">
                                    Buy {selectedCrop.name}
                                </h3>

                                <div className="mb-4 space-y-2">
                                    <p className="text-base font-semibold text-gray-700">
                                        Available:
                                        <span className="font-bold text-lg text-gray-900 ml-1">
                                            {selectedCrop.quantity} kg
                                        </span>
                                    </p>

                                    <p className="text-base font-semibold text-gray-700">
                                        Price per kg:
                                        <span className="font-bold text-lg text-green-700 ml-1">
                                            ₹{selectedCrop.price}
                                        </span>
                                    </p>
                                </div>

                                <input
                                    type="number"
                                    min={selectedCrop.minQty}
                                    max={selectedCrop.quantity}
                                    value={buyQuantity === 0 ? "" : buyQuantity}
                                    onChange={e => setBuyQuantity(Number(e.target.value || 0))}
                                    className={`w-full border rounded-xl p-3 text-center font-bold text-lg mb-3 transition
    ${isInvalidQty
                                            ? "border-red-500 text-red-600 bg-red-50"
                                            : "border-gray-300 text-gray-800"
                                        }`}
                                />

                                <p className="font-semibold mb-3">
                                    Total: ₹{(buyQuantity * selectedCrop.price).toFixed(2)}
                                </p>

                                {buyQuantity < selectedCrop.minQty && (
                                    <p className="text-red-500 text-sm mb-2">
                                        Minimum order is {selectedCrop.minQty} kg
                                    </p>
                                )}

                                {buyQuantity > selectedCrop.quantity && (
                                    <p className="text-red-500 text-sm mb-2">
                                        Only {selectedCrop.quantity} kg available in stock
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowQtyModal(false)}
                                        className="flex-1 py-2 bg-gray-100 rounded-xl font-bold"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        disabled={isInvalidQty}
                                        onClick={() => {
                                            setShowQtyModal(false);
                                            handleBuy({ ...selectedCrop, buyQuantity });
                                        }}
                                        className={`flex-1 py-2 rounded-xl font-bold transition
    ${isInvalidQty
                                                ? "bg-green-300 cursor-not-allowed text-white"
                                                : "bg-green-600 hover:bg-green-700 text-white"
                                            }`}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showAIModal && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                            <div className="bg-white p-8 rounded-2xl w-96 text-center">

                                <h2 className="text-2xl font-bold mb-4">🤖 AI Market Check</h2>

                                {aiLoading && (
                                    <p className="text-gray-600 animate-pulse">
                                        Analyzing market price...
                                    </p>
                                )}

                                {!aiLoading && aiResult && (
                                    <div className="space-y-6">

                                        {/* PRICE FAIRNESS CARD */}
                                        <div className={`p-4 rounded-xl font-bold text-lg ${aiResult.priceVerdict === "cheap"
                                            ? "bg-green-100 text-green-700"
                                            : aiResult.priceVerdict === "fair"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-red-100 text-red-700"
                                            }`}>
                                            {aiResult.priceVerdict === "cheap" && "🟢 Great Deal — Below Market Price"}
                                            {aiResult.priceVerdict === "fair" && "✅ Fair Market Price"}
                                            {aiResult.priceVerdict === "high" && "🔴 Higher Than Market Price"}
                                        </div>

                                        {/* BUY TIMING CARD */}
                                        <div className={`p-4 rounded-xl font-bold text-lg ${aiResult.buyAdvice === "buy"
                                            ? "bg-green-100 text-green-700"
                                            : aiResult.buyAdvice === "neutral"
                                                ? "bg-gray-100 text-gray-700"
                                                : "bg-red-100 text-red-700"
                                            }`}>
                                            {aiResult.buyAdvice === "buy" && "📈 Good Day to Buy — Prices Rising"}
                                            {aiResult.buyAdvice === "neutral" && "➖ Market Stable"}
                                            {aiResult.buyAdvice === "wait" && "📉 Better to Wait — Prices Dropping"}
                                        </div>

                                        {/* AI SUMMARY */}
                                        <div className="text-sm text-gray-600 italic">
                                            AI analyzed recent market trends and current supply-demand before giving this advice.
                                        </div>

                                        <button
                                            onClick={() => {
                                                setShowAIModal(false);

                                                navigate("/payment", {
                                                    state: {
                                                        cropId: selectedCrop.id,
                                                        name: selectedCrop.name,
                                                        price: aiResult?.final_price || selectedCrop.price,
                                                        quantity: buyQuantity
                                                    }
                                                });


                                            }}
                                            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
                                        >
                                            Continue to Buy
                                        </button>

                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </>
    );
}
