import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const truckIcon = new L.DivIcon({
    className: "",
    html: `
        <div style="
            background:#ef4444;
            width:36px;
            height:36px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:bold;
            border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
            font-size:16px;
        ">
            🚚
        </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
});
const farmerIcon = new L.DivIcon({
    className: "",
    html: `
        <div style="
            background:#16a34a;
            width:32px;
            height:32px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:bold;
            border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
        ">
            F
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const buyerIcon = new L.DivIcon({
    className: "",
    html: `
        <div style="
            background:#2563eb;
            width:32px;
            height:32px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:bold;
            border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
        ">
            B
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});
interface Props {
    route?: {
        coordinates: [number, number][];
    };
    vehicle?: {
        current_lat: number;
        current_lon: number;
    };
}

const ResizeMap = () => {
    const map = useMap();

    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    }, [map]);

    return null;
};

const RouteMap: React.FC<Props> = ({ route, vehicle }) => {
    if (!route?.coordinates?.length) return null;

    const positions: [number, number][] = route.coordinates.map(
        (coord) => [coord[1], coord[0]]
    );

    const vehiclePosition =
        vehicle?.current_lat != null &&
            vehicle?.current_lon != null
            ? [vehicle.current_lat, vehicle.current_lon] as [number, number]
            : null;

    const center = vehiclePosition || positions[0];

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg">            <MapContainer
            center={center}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
        >
            <ResizeMap />

            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Polyline positions={positions} color="blue" />

            {/* Farmer (Pickup) */}
            <Marker position={positions[0]} icon={farmerIcon} />

            {/* Buyer (Drop) */}
            <Marker
                position={positions[positions.length - 1]}
                icon={buyerIcon}
            />

            {vehiclePosition && (
                <Marker position={vehiclePosition} icon={truckIcon} />
            )}
        </MapContainer>
        </div>
    );
};

export default RouteMap;