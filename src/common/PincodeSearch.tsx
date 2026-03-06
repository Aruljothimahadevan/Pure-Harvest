import { useState, useEffect } from "react";
import Papa from "papaparse";

export default function PincodeSearch() {
  const [pincode, setPincode] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const [gpsLocation, setGpsLocation] = useState<any>(null);
  const [gpsError, setGpsError] = useState(false);

  // Load CSV + GPS on start
  useEffect(() => {
    // GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setGpsError(true);
      }
    );

    // CSV
    fetch("/pincode.csv")
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          complete: (results: any) => {
            setData(results.data);
          },
        });
      });
  }, []);

  // Handle typing
  const handleChange = (value: string) => {
    setPincode(value);

    const filtered = data.filter(
      (row) =>
        row.PINCODE?.startsWith(value) ||
        row.TALUK?.toLowerCase().includes(value.toLowerCase())
    );

    setSuggestions(filtered.slice(0, 5));
  };

  // Select suggestion
  const selectSuggestion = (row: any) => {
    setSelected(row);
    setPincode(row.PINCODE);
    setSuggestions([]);
  };

  return (
    <div style={{ padding: 20 }}>

      {/* GPS SUCCESS */}
      {gpsLocation && (
        <div>
          <h4>GPS Location Found ✅</h4>
          <p>Lat: {gpsLocation.lat}</p>
          <p>Lng: {gpsLocation.lng}</p>

          <button onClick={() => setGpsError(true)}>
            Enter Manually
          </button>
        </div>
      )}

      {/* GPS FAILED → MANUAL */}
      {gpsError && (
        <>
          <h4>Enter Pincode or Taluk</h4>

          <input
            value={pincode}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Type pincode or taluk"
          />

          {/* Suggestions */}
          {suggestions.map((row, i) => (
            <div
              key={i}
              style={{
                cursor: "pointer",
                background: "#eee",
                padding: 5,
                marginTop: 2,
              }}
              onClick={() => selectSuggestion(row)}
            >
              {row.PINCODE} — {row.TALUK}
            </div>
          ))}
        </>
      )}

      {/* Selected Result */}
      {selected && (
        <div style={{ marginTop: 10 }}>
          <p>Taluk: {selected.TALUK}</p>
          <p>District: {selected.DISTRICT}</p>
          <p>State: {selected.STATE}</p>
        </div>
      )}

    </div>
  );
}
