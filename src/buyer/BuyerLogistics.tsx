import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RouteMap from "../common/RouteMap";
import {
    Truck,
    Package,
    MapPin,
    Clock,
    AlertCircle,
    CheckCircle2,
    Navigation,
    ExternalLink
} from "lucide-react";

// --- Interfaces ---

interface DeliveryItem {

    distance_km: number;
    id: number;
    order_id: number;
    farmer_id: string;
    crop: string;
    quantity: number;
    price_per_kg: number;
    total_amount: number;
    partner: string;

    vehicle?: {
        id: number | null;
        current_lat: number | null;
        current_lon: number | null;
    };

    status: "Processing" | "In Transit" | "Delivered";
    eta: string;
    delay_risk: "Low" | "Medium" | "High";

    route?: {
        coordinates: [number, number][];
    };
}

const BuyerLogistics: React.FC = () => {
    const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [buyerId, setBuyerId] = useState<string | null>(null);

    useEffect(() => {
        const id = sessionStorage.getItem("buyerId");

        if (id) {
            setBuyerId(id);
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!buyerId) return;

        fetchDeliveries(buyerId);

        const interval = setInterval(() => {
            fetchDeliveries(buyerId);
        }, 8000); // 🔥 refresh every 5 sec

        return () => clearInterval(interval);

    }, [buyerId]);

    const fetchDeliveries = async (id: string): Promise<void> => {
        try {
            const response = await fetch(
                `http://pure-harvest.onrender.com/api/logistics/buyer/${id}`
            );

            const data: DeliveryItem[] = await response.json();
            setDeliveries(data);
        } catch (error) {
            console.error("Error fetching logistics:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: DeliveryItem["status"]): number => {
        const steps: Record<DeliveryItem["status"], number> = {
            "Processing": 1,
            "In Transit": 2,
            "Delivered": 3
        };
        return steps[status] || 1;
    };

    const getRiskStyles = (risk: DeliveryItem["delay_risk"]): string => {
        switch (risk) {
            case "High": return "text-red-500 bg-red-50 border-red-100";
            case "Medium": return "text-amber-500 bg-amber-50 border-amber-100";
            default: return "text-emerald-500 bg-emerald-50 border-emerald-100";
        }
    };
    const getRemainingTime = (eta: string) => {
        if (!eta) return "Calculating...";

        const etaTime = new Date(eta).getTime();
        if (isNaN(etaTime)) return "Calculating...";

        const diff = etaTime - now;

        if (diff <= 0) return "Arriving Soon";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m remaining`;
    };
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, []);
    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans overflow-x-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">
                            Logistics Tracker
                        </h1>
                        <p className="text-xs text-slate-500">
                            Live updates for your farm-to-table journey
                        </p>
                    </div>

                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                        <Truck className="text-emerald-600" size={20} />
                    </div>
                </div>
            </div>

            <main className="w-full px-8 xl:px-20 2xl:px-40">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-emerald-600"></div>
                    </div>
                ) : deliveries.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center bg-white p-12 rounded-3xl border border-dashed border-slate-300"
                    >
                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800">No active shipments</h3>
                        <p className="text-slate-500">Your orders will appear here once they are processed.</p>
                    </motion.div>
                ) : (
                    <div className="grid gap-6">
                        <AnimatePresence>
                            {deliveries.map((item, index) => {
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden w-full"
                                    >
                                        {/* Status Banner */}
                                        <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-600">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-slate-800">
                                                        {item.crop}
                                                    </h2>

                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Farmer ID: <span className="font-bold text-slate-700">
                                                            {item.farmer_id}
                                                        </span>
                                                    </p>

                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                                                        Order ID: {item.order_id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold ${getRiskStyles(item.delay_risk)}`}>
                                                <AlertCircle size={14} />
                                                {item.delay_risk} Delay Risk
                                            </div>
                                        </div>

                                        <div className="px-6 pt-6 pb-0">
                                            {/* Stepper Logic */}
                                            <div className="relative flex justify-between items-center mb-12">
                                                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full"></div>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(getStatusStep(item.status) - 1) * 50}%` }}
                                                    className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full z-0"
                                                ></motion.div>

                                                {["Processing", "In Transit", "Delivered"].map((label, i) => {
                                                    const stepNum = i + 1;
                                                    const isCompleted = getStatusStep(item.status) >= stepNum;
                                                    const isCurrent = getStatusStep(item.status) === stepNum;

                                                    return (
                                                        <div key={label} className="relative z-10 flex flex-col items-center">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-white shadow-md transition-all duration-500 ${isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                                                } ${isCurrent ? "scale-110 ring-4 ring-emerald-50" : ""}`}>
                                                                {isCompleted && stepNum < getStatusStep(item.status) ? <CheckCircle2 size={20} /> : (
                                                                    i === 0 ? <Package size={20} /> : i === 1 ? <Truck size={20} /> : <MapPin size={20} />
                                                                )}
                                                            </div>
                                                            <span className={`absolute -bottom-8 text-xs font-bold ${isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                                                                {label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Meta Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-slate-50">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                        Order Details
                                                    </span>

                                                    <span className="text-sm font-semibold text-slate-700">
                                                        Quantity: {item.quantity} kg
                                                    </span>

                                                    <span className="text-sm text-slate-600">
                                                        ₹{item.price_per_kg} / kg
                                                    </span>

                                                    <span className="text-sm font-bold text-emerald-600">
                                                        Total Paid: ₹{item.total_amount}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Logistics Partner</span>
                                                    <div className="flex items-center gap-2">
                                                        <Navigation size={16} className="text-blue-500" />
                                                        <span className="text-sm font-bold text-slate-700">{item.partner}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 ml-6">
                                                        {item.vehicle?.id
                                                            ? `Vehicle ID: ${item.vehicle.id}`
                                                            : "Vehicle Assigned"}

                                                        {item.vehicle?.current_lat != null && (
                                                            <div className="text-xs text-slate-400 mt-1">
                                                                Current:
                                                                {item.vehicle.current_lat.toFixed(3)},
                                                                {item.vehicle.current_lon?.toFixed(3)}
                                                            </div>
                                                        )}
                                                    </div>                                           </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Estimated Delivery</span>
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={16} className="text-purple-500" />
                                                        <span className="text-sm font-bold text-slate-700">
                                                            {item.status === "Delivered"
                                                                ? "Delivered Successfully"
                                                                : getRemainingTime(item.eta)}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {item.status === "Delivered"
                                                                ? "Package Delivered"
                                                                : `${item.distance_km} km remaining`}
                                                        </span>   
                                                                                                     </div>
                                                </div>

                                                <div className="flex items-center md:justify-end">
                                                    <button className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                                        Tracking Details <ExternalLink size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {item.route &&
                                                item.vehicle?.current_lat != null &&
                                                item.vehicle?.current_lon != null && (
                                                    <div className="mt-10 w-full block clear-both">
                                                        {/* 🗺 Map Section - Edge-to-Edge Strategy */}
                                                        <div className="relative border-t border-slate-100 bg-slate-50 w-full">
                                                            {/* Live Indicator Overlay */}
                                                            <div className="absolute top-4 left-12 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-slate-200">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-700 uppercase">Live Tracking</span>
                                                            </div>

                                                            {/* Map Container: Ensuring 100% width visibility for Leaflet */}
                                                            <div className="w-full h-[350px] md:h-[420px] overflow-hidden">
                                                                <RouteMap
                                                                    route={item.route}
                                                                    vehicle={{
                                                                        current_lat: item.vehicle.current_lat,
                                                                        current_lon: item.vehicle.current_lon
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BuyerLogistics;
