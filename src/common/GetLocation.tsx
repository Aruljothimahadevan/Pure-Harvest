import { useState } from "react";
import { MapPin, Navigation, AlertCircle, Save, Loader2 } from "lucide-react";

type LocationType = {
  lat: number;
  lng: number;
} | null;

export default function GetLocation() {
  const [location, setLocation] = useState<LocationType>(null);
  const [district, setDistrict] = useState<string>("");
  const [manualLocation, setManualLocation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    setLoading(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        convertToPlace(lat, lng);
      },
      () => {
        setError("Location OFF — Enter manually");
        setLoading(false);
      }
    );
  };

const convertToPlace = async (lat: number, lng: number) => {
  try {
    const res = await fetch("https://pure-harvest.onrender.com/api/get-location-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat, lng }),
    });

    const data = await res.json();

    if (data.error) {
      setDistrict("Not found");
    } else {
      setDistrict(`${data.district} (${data.pincode})`);
    }
  } catch (err) {
    setError("Failed to fetch district.");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

        {/* Header Section */}
        <div className="bg-indigo-600 p-8 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Check-in</h1>
          <p className="text-indigo-100 text-sm opacity-90">Verify your current district</p>
        </div>

        <div className="p-8">
          {/* Action Button */}
          {!location && !error && (
            <button
              onClick={getLocation}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Navigation size={20} />}
              {loading ? "Locating..." : "Find My Location"}
            </button>
          )}

          {/* GPS Success Result */}
          {location && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Detected District</span>
                <p className="text-xl font-semibold text-green-900">{district || "Fetching..."}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Latitude</span>
                  <span className="font-mono text-slate-700">{location.lat.toFixed(4)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Longitude</span>
                  <span className="font-mono text-slate-700">{location.lng.toFixed(4)}</span>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full text-sm text-slate-400 hover:text-indigo-600 transition-colors"
              >
                Reset and try again
              </button>
            </div>
          )}

          {/* Error & Manual Input */}
          {error && (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-sm border border-red-100">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Manual Entry</label>
                <input
                  type="text"
                  placeholder="Enter Village or District"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <button
                onClick={() => alert("Manual location saved: " + manualLocation)}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Location
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}