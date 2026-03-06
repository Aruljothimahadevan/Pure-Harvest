from flask import Flask, request, jsonify
import geopandas as gpd
from shapely.geometry import Point
from sklearn.cluster import DBSCAN
import numpy as np

app = Flask(__name__)
from flask_cors import CORS

CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
)
app.config["CORS_HEADERS"] = "Content-Type"
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import requests
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()
DATA_SOURCE = os.getenv("DATA_SOURCE", "supabase")
DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
import random
import math
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from datetime import datetime, timedelta, timezone
import pickle
from sqlalchemy.exc import SQLAlchemyError

rf_model = None


def load_model():
    global rf_model
    if rf_model is None:
        with open("tn_final_model.pkl", "rb") as f:
            rf_model = pickle.load(f)


with open("le_commodity.pkl", "rb") as f:
    le_commodity = pickle.load(f)

with open("le_district.pkl", "rb") as f:
    le_district = pickle.load(f)
pincodes = None


def normalize_commodity(name):
    return name.split("/")[0].strip().lower()


def load_pincodes():
    global pincodes

    if pincodes is None:
        pincodes = gpd.read_file("pincode.geojson")


# connecting the app with gov API
def fetch_real_market_price(commodity, district):

    commodity = commodity.strip().lower()
    district = district.strip().lower()

    res = (
        supabase.table("commodity_prices")
        .select("price")
        .ilike("commodity", f"%{commodity}%")
        .ilike("district", f"%{district}%")
        .order("date", desc=True)
        .limit(1)
        .execute()
    )

    if not res.data:

        return None

    return float(res.data[0]["price"])


def get_road_distance(lat1, lon1, lat2, lon2):
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
        r = requests.get(url, timeout=3)
        data = r.json()
        return data["routes"][0]["distance"] / 1000  # meters → km
    except Exception:
        return calculate_distance(lat1, lon1, lat2, lon2)


def predict_delay(distance_km, traffic):
    if traffic == "heavy" or distance_km > 150:
        return "High"
    elif distance_km > 80:
        return "Medium"
    return "Low"


def update_vehicle_positions():
    with app.app_context():

        vehicles = Vehicle.query.filter(
            Vehicle.status.in_(["In Transit", "Idle"])
        ).all()

        if not vehicles:
            return

        for v in vehicles:

            next_delivery = (
                Delivery.query.filter(
                    Delivery.vehicle_id == v.id, Delivery.status != "Delivered"
                )
                .order_by(Delivery.sequence_order)
                .limit(1)
                .first()
            )

            if not next_delivery:
                v.status = "Idle"
                continue

            farmer = Farmer.query.get(next_delivery.order.farmer_id)
            buyer = Buyer.query.get(next_delivery.order.buyer_id)

            if not farmer or not buyer:
                continue

            # Decide current target
            if next_delivery.status == "Processing":
                target_lat = farmer.latitude
                target_lon = farmer.longitude
            else:
                target_lat = buyer.latitude
                target_lon = buyer.longitude

            # 🔥 REAL SPEED LOGIC
            # 40 km/h truck speed
            speed_km_per_hour = 45  # 🔥 VERY FAST (test mode)
            update_interval_sec = 5  # 🔥 update every 3 sec
            speed_km_per_update = speed_km_per_hour * (update_interval_sec / 3600)

            distance_km = calculate_distance(
                v.current_lat, v.current_lon, target_lat, target_lon
            )
            # if already close → change state
            if distance_km <= 2:  # 🔥 larger arrival radius
                if next_delivery.status == "Processing":
                    next_delivery.status = "In Transit"

                elif next_delivery.status == "In Transit":

                    next_delivery.status = "Delivered"

                    order = next_delivery.order

                    note = Notification(
                        user_id=order.farmer_id,
                        role="farmer",
                        message=f"🚚 Order #{order.id} delivered successfully to buyer.",
                    )

                    db.session.add(note)
                    # 🔥 Auto-complete order
                    order = next_delivery.order
                    escrow = EscrowPayment.query.filter_by(order_id=order.id).first()

                    if escrow and escrow.status == "HELD":
                        escrow.status = "RELEASED"
                        order.status = "Completed"

                        wallet = FarmerWallet.query.get(order.farmer_id)
                        if wallet:
                            wallet.balance += escrow.amount

                continue

            # Move gradually toward target (CORRECT VERSION)
            lat_diff = target_lat - v.current_lat
            lon_diff = target_lon - v.current_lon

            distance_km = calculate_distance(
                v.current_lat, v.current_lon, target_lat, target_lon
            )

            if distance_km > 0:
                step_ratio = min(speed_km_per_update / distance_km, 1)

                v.current_lat += lat_diff * step_ratio
                v.current_lon += lon_diff * step_ratio

        db.session.commit()


def insert_best_position(order, vehicle):

    existing_stops = (
        Delivery.query.filter_by(vehicle_id=vehicle.id)
        .order_by(Delivery.sequence_order)
        .all()
    )

    farmer = Farmer.query.get(order.farmer_id)
    buyer = Buyer.query.get(order.buyer_id)

    if not farmer or not buyer:
        return None

    new_points = [
        (farmer.latitude, farmer.longitude),
        (buyer.latitude, buyer.longitude),
    ]

    best_position = 0
    min_extra_cost = float("inf")

    route_points = [(vehicle.current_lat, vehicle.current_lon)]

    for stop in existing_stops:
        f = Farmer.query.get(stop.order.farmer_id)
        b = Buyer.query.get(stop.order.buyer_id)
        route_points.append((f.latitude, f.longitude))
        route_points.append((b.latitude, b.longitude))

    for i in range(1, len(route_points)):
        prev = route_points[i - 1]
        curr = route_points[i]

        original_cost = calculate_distance(prev[0], prev[1], curr[0], curr[1])

        new_cost = (
            calculate_distance(prev[0], prev[1], new_points[0][0], new_points[0][1])
            + calculate_distance(
                new_points[0][0], new_points[0][1], new_points[1][0], new_points[1][1]
            )
            + calculate_distance(new_points[1][0], new_points[1][1], curr[0], curr[1])
        )

        extra_cost = new_cost - original_cost

        if extra_cost < min_extra_cost:
            min_extra_cost = extra_cost
            best_position = i // 2

    return best_position


from sqlalchemy import func

otp_store = {}  # phone -> otp
prediction_cache = {}

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")

app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"connect_args": {"sslmode": "require"}}

# PostgreSQL connection
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

import uuid


class Farmer(db.Model):
    public_id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True, index=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    district = db.Column(db.String(50))
    state = db.Column(db.String(50))
    village = db.Column(db.String(50))
    profile_image = db.Column(db.Text)  # ✅ ADD THIS
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)


class Buyer(db.Model):
    public_id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True, index=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    district = db.Column(db.String(50))
    state = db.Column(db.String(50))
    village = db.Column(db.String(50))
    profile_image = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey("order.id"))
    farmer_id = db.Column(db.String(20))
    buyer_id = db.Column(db.String(20))

    quality = db.Column(db.Integer)
    freshness = db.Column(db.Integer)
    packaging = db.Column(db.Integer)

    average_rating = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class FarmerBankDetails(db.Model):
    __tablename__ = "farmer_bank_details"

    farmer_id = db.Column(
        db.String(20), db.ForeignKey("farmer.public_id"), primary_key=True
    )

    account_holder_name = db.Column(db.String(100))
    account_number = db.Column(db.String(30))
    bank_name = db.Column(db.String(100))
    ifsc_code = db.Column(db.String(20))

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    vehicle_type = db.Column(db.String(50))  # Mini Truck / Truck
    capacity = db.Column(db.Float)

    current_lat = db.Column(db.Float)
    current_lon = db.Column(db.Float)

    status = db.Column(db.String(30))  # Idle / In Transit

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.String(20), index=True)
    crop_id = db.Column(db.Integer, index=True)
    __table_args__ = (
        db.UniqueConstraint("buyer_id", "crop_id", name="unique_favorite"),
    )


from sqlalchemy.dialects.postgresql import JSON


class Crop(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.String(20), db.ForeignKey("farmer.public_id"), index=True)

    name = db.Column(db.String(50))
    quantity = db.Column(db.Float)
    price = db.Column(db.Float)
    status = db.Column(db.String(30), index=True)

    photos = db.Column(JSON)  # ⭐ ADD THIS LINE

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    farmer = db.relationship("Farmer", backref="crops")


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    crop_id = db.Column(db.Integer, db.ForeignKey("crop.id"), index=True)
    farmer_id = db.Column(db.String(20), index=True)
    buyer_id = db.Column(db.String(20), index=True)

    quantity = db.Column(db.Float)
    amount = db.Column(db.Float)

    status = db.Column(db.String(30))
    payment_method = db.Column(db.String(50))
    payment_status = db.Column(db.String(30))

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    crop = db.relationship("Crop")
    pickup_start = db.Column(db.DateTime)
    pickup_end = db.Column(db.DateTime)


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(20))
    role = db.Column(db.String(20))  # buyer / farmer
    message = db.Column(db.String(255))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class EscrowPayment(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey("order.id"))

    buyer_id = db.Column(db.String(20))
    farmer_id = db.Column(db.String(20))

    amount = db.Column(db.Float)

    status = db.Column(db.String(20), default="HELD")
    # HELD | RELEASED | REFUNDED

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class FarmerWallet(db.Model):
    farmer_id = db.Column(db.String(20), primary_key=True)

    balance = db.Column(db.Float, default=0)

    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SearchLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.String(20), index=True)
    commodity = db.Column(db.String(50), index=True)
    date = db.Column(db.Date, default=lambda: datetime.now(timezone.utc).date())
    count = db.Column(db.Integer, default=1)


class Delivery(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey("order.id"))
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicle.id"))
    sequence_order = db.Column(db.Integer)

    pickup_district = db.Column(db.String(50))
    drop_district = db.Column(db.String(50))

    partner = db.Column(db.String(50))
    status = db.Column(db.String(30))  # Processing / In Transit / Delivered
    eta = db.Column(db.DateTime)

    delivery_otp = db.Column(db.String(6))  # 🔥 ADD
    otp_verified = db.Column(db.Boolean, default=False)  # 🔥 ADD

    order = db.relationship("Order", backref="delivery")
    vehicle = db.relationship("Vehicle", backref="deliveries")


def get_buyer_history(buyer_id):
    orders = Order.query.filter_by(buyer_id=buyer_id).all()
    return [o.crop.name for o in orders]


def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def optimize_route(vehicle, stops):

    unvisited = stops.copy()
    ordered = []
    current_lat = vehicle.current_lat
    current_lon = vehicle.current_lon

    while unvisited:
        nearest = min(
            unvisited,
            key=lambda s: calculate_distance(
                current_lat,
                current_lon,
                Farmer.query.get(s.order.farmer_id).latitude,
                Farmer.query.get(s.order.farmer_id).longitude,
            ),
        )

        ordered.append(nearest)

        farmer = Farmer.query.get(nearest.order.farmer_id)
        current_lat = farmer.latitude
        current_lon = farmer.longitude

        unvisited.remove(nearest)

    return ordered


def create_delivery(order, vehicle, position):
    existing_delivery = Delivery.query.filter_by(order_id=order.id).first()
    if existing_delivery:
        return
    # Shift sequence orders
    existing = (
        Delivery.query.filter_by(vehicle_id=vehicle.id)
        .order_by(Delivery.sequence_order)
        .all()
    )

    for d in existing:
        if d.sequence_order >= position:
            d.sequence_order += 1

    new_delivery = Delivery(
        order_id=order.id,
        vehicle_id=vehicle.id,
        sequence_order=position,
        pickup_district=order.crop.farmer.district,
        drop_district=Buyer.query.get(order.buyer_id).district,
        partner="AgriLogistics",
        status="Processing",
        eta=datetime.utcnow() + timedelta(days=2),
    )

    db.session.add(new_delivery)
    db.session.commit()


def assign_delivery(order, farmer, buyer):
    try:
        active_vehicles = Vehicle.query.filter(
            Vehicle.status.in_(["In Transit", "Idle"])
        ).all()

        # Sort vehicles by distance to farmer
        active_vehicles = sorted(
            active_vehicles,
            key=lambda v: calculate_distance(
                v.current_lat, v.current_lon, farmer.latitude, farmer.longitude
            ),
        )

        best_vehicle = None
        best_position = None
        best_cost = float("inf")
        # 🔥 CLUSTER-BASED ASSIGNMENT
        all_processing = Delivery.query.filter(Delivery.status == "Processing").all()

        cluster_points = []
        delivery_map = []

        for d in all_processing:
            f = Farmer.query.get(d.order.farmer_id)
            if f:
                cluster_points.append([f.latitude, f.longitude])
                delivery_map.append(d)

        if len(cluster_points) >= 3:
            clustering = DBSCAN(eps=0.08, min_samples=2).fit(cluster_points)

            labels = clustering.labels_

            # Find cluster of current farmer
            current_point = np.array([[farmer.latitude, farmer.longitude]])
            distances = np.linalg.norm(np.array(cluster_points) - current_point, axis=1)

            nearest_idx = np.argmin(distances)
            cluster_id = labels[nearest_idx]

            # Only consider vehicles serving same cluster
            cluster_deliveries = [
                delivery_map[i] for i, label in enumerate(labels) if label == cluster_id
            ]

            cluster_vehicle_ids = list(
                set(d.vehicle_id for d in cluster_deliveries if d.vehicle_id)
            )

            if cluster_vehicle_ids:
                active_vehicles = [
                    v for v in active_vehicles if v.id in cluster_vehicle_ids
                ]
        for vehicle in active_vehicles:

            used_capacity = (
                db.session.query(func.sum(Order.quantity))
                .join(Delivery, Delivery.order_id == Order.id)
                .filter(
                    Delivery.vehicle_id == vehicle.id, Delivery.status != "Delivered"
                )
                .scalar()
                or 0
            )

            remaining_capacity = vehicle.capacity - used_capacity

            if remaining_capacity < order.quantity:
                continue

            position = insert_best_position(order, vehicle)
            if position is not None:
                cost = calculate_distance(
                    vehicle.current_lat,
                    vehicle.current_lon,
                    farmer.latitude,
                    farmer.longitude,
                )

                if cost < best_cost:
                    best_cost = cost
                    best_vehicle = vehicle
                    best_position = position

        if best_vehicle:
            best_vehicle.status = "In Transit"
            create_delivery(order, best_vehicle, best_position)

        else:
            new_vehicle = Vehicle(
                vehicle_type="Mini Truck",
                capacity=500,
                current_lat=farmer.latitude,
                current_lon=farmer.longitude,
                status="In Transit",
            )

            db.session.add(new_vehicle)
            db.session.commit()

            create_delivery(order, new_vehicle, 0)

        db.session.commit()

    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Delivery assignment error: {e}")


def calculate_score(crop, history):
    score = 0

    if crop["name"] in history:
        score += 5  # buyer preference boost

    if crop["quantity"] > 50:
        score += 2  # fresh stock assumption

    return score


# ✅ ADD HELPER FUNCTION HERE
def get_user_by_role(role, phone):
    if role == "farmer":
        return Farmer.query.filter_by(phone=phone).first()
    elif role == "buyer":
        return Buyer.query.filter_by(phone=phone).first()
    return None


@app.route("/api/buyer/favorites/<buyer_id>")
def buyer_favorites(buyer_id):

    favorites = (
        db.session.query(Crop)
        .join(Favorite, Favorite.crop_id == Crop.id)
        .filter(Favorite.buyer_id == buyer_id)
        .all()
    )

    return jsonify(
        [
            {
                "id": c.id,
                "name": c.name,
                "price": c.price,
                "farmer_id": c.farmer_id,
                "quantity": c.quantity,
            }
            for c in favorites
        ]
    )


from supabase import create_client

SUPABASE_URL = "https://qpqfufzolvxoubewdpzd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


@app.route("/api/logistics/<role>/<user_id>")
def logistics(role, user_id):

    deliveries = (
        db.session.query(Delivery)
        .join(Order)
        .filter(
            Order.farmer_id == user_id
            if role == "farmer"
            else Order.buyer_id == user_id
        )
        .all()
    )

    result = []

    for d in deliveries:

        if not d.order:
            continue

        vehicle = d.vehicle
        farmer = Farmer.query.get(d.order.farmer_id)
        buyer = Buyer.query.get(d.order.buyer_id)

        distance = 0
        delay_risk = "Low"
        eta_time = None
        route_data = None

        if vehicle and buyer:

            distance = calculate_distance(
                vehicle.current_lat,
                vehicle.current_lon,
                buyer.latitude,
                buyer.longitude,
            )
            # --- PROGRESS CALCULATION ---
            total_distance = calculate_distance(
                farmer.latitude, farmer.longitude, buyer.latitude, buyer.longitude
            )

            progress_percent = 0
            if total_distance > 0:
                progress_percent = max(
                    0,
                    min(100, int(((total_distance - distance) / total_distance) * 100)),
                )

            # --- 90% Notification Only (No Verification Needed) ---
            if progress_percent >= 90 and not d.delivery_otp:
                otp = str(random.randint(1000, 9999))
                d.delivery_otp = otp  # just for display

                note = Notification(
                    user_id=d.order.buyer_id,
                    role="buyer",
                    message=f"🚚 Delivery almost arrived! OTP: {otp}",
                )

                db.session.add(note)
                db.session.commit()
            # Load-based speed
            used_capacity = (
                db.session.query(func.sum(Order.quantity))
                .join(Delivery)
                .filter(
                    Delivery.vehicle_id == vehicle.id,
                    Delivery.status != "Delivered",
                )
                .scalar()
                or 0
            )

            load_ratio = used_capacity / vehicle.capacity
            speed = max(30, 50 - (load_ratio * 15))

            hours_remaining = distance / speed
            eta_time = datetime.utcnow() + timedelta(hours=hours_remaining)

            # Traffic
            hour = datetime.utcnow().hour
            traffic = "heavy" if 8 <= hour <= 11 or 17 <= hour <= 20 else "light"

            delay_risk = predict_delay(distance, traffic)

            # Build route once
            coords = [
                f"{vehicle.current_lon},{vehicle.current_lat}",
                f"{buyer.longitude},{buyer.latitude}",
            ]

            osrm_url = (
                "http://router.project-osrm.org/route/v1/driving/"
                + ";".join(coords)
                + "?overview=simplified&geometries=geojson"
            )

            try:
                r = requests.get(osrm_url, timeout=3)
                data = r.json()
                route_data = data["routes"][0]["geometry"]
            except Exception:
                route_data = None

        result.append(
            {
                "id": d.id,
                "order_id": d.order.id,
                "farmer_id": d.order.farmer_id,
                "crop": d.order.crop.name,
                "quantity": d.order.quantity,
                "price_per_kg": d.order.crop.price,
                "total_amount": d.order.amount,
                "partner": d.partner or "AgriLogistics",
                "status": d.status,
                "eta": eta_time.isoformat() if eta_time else "TBD",
                "distance_km": round(distance, 2),
                "delay_risk": delay_risk,
                "vehicle": {
                    "id": vehicle.id if vehicle else None,
                    "current_lat": vehicle.current_lat if vehicle else None,
                    "current_lon": vehicle.current_lon if vehicle else None,
                },
                "route": (
                    {"coordinates": route_data["coordinates"]} if route_data else None
                ),
                "progress": progress_percent,
            }
        )

    return jsonify(result)


@app.route("/api/farmer/profile-image/<public_id>", methods=["POST"])
def upload_profile_image(public_id):
    user = Farmer.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    image = request.json.get("image")

    if not image:
        return jsonify({"error": "No image"}), 400

    user.profile_image = image  # Base64 string
    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/notifications/clear-seen/farmer/<farmer_id>", methods=["DELETE"])
def clear_seen_farmer_notifications(farmer_id):

    Notification.query.filter_by(
        user_id=farmer_id, role="farmer", is_read=True
    ).delete()

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/notifications/buyer/<buyer_id>")
def buyer_notifications(buyer_id):

    notes = (
        Notification.query.filter_by(user_id=buyer_id, role="buyer")
        .order_by(Notification.id.desc())
        .all()
    )

    return jsonify(
        [
            {
                "id": n.id,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notes
        ]
    )


@app.route("/api/confirm-payment/<int:order_id>", methods=["POST"])
def confirm_payment(order_id):

    order = Order.query.get(order_id)
    crop = Crop.query.get(order.crop_id)

    if not order or not crop:
        return jsonify({"error": "Order not found"}), 404

    if crop.quantity < order.quantity:
        return jsonify({"error": "Out of stock"}), 400

    crop.quantity -= order.quantity

    if crop.quantity <= 0:
        crop.status = "Inactive"

    order.status = "Escrow Held"
    order.payment_status = "Escrow"

    escrow = EscrowPayment(
        order_id=order.id,
        buyer_id=order.buyer_id,
        farmer_id=order.farmer_id,
        amount=order.amount,
        status="HELD",
    )
    # 🔔 Notify farmer
    note = Notification(
        user_id=order.farmer_id,
        role="farmer",
        message=f"💰 Payment received for order #{order.id}. Preparing shipment.",
    )

    db.session.add(note)

    db.session.add(escrow)

    # 🚚 ADD THIS BLOCK
    farmer = Farmer.query.get(order.farmer_id)
    buyer = Buyer.query.get(order.buyer_id)
    assign_delivery(order, farmer, buyer)

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/order", methods=["POST"])
def create_order():
    data = request.json

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    if data.get("quantity", 0) <= 0:
        return jsonify({"error": "Invalid quantity"}), 400

    crop = Crop.query.get(data["crop_id"])

    if not crop:
        return jsonify({"error": "Crop not found"}), 404

    if crop.quantity < data["quantity"]:
        return jsonify({"error": "Not enough stock"}), 400

    total_amount = crop.price * data["quantity"]

    new_order = Order(
        crop_id=crop.id,
        farmer_id=crop.farmer_id,
        buyer_id=data["buyer_id"],
        quantity=data["quantity"],
        amount=total_amount,
        status="Pending Payment",
        payment_method=data.get("payment_method"),
        payment_status="Pending",
    )

    db.session.add(new_order)
    db.session.commit()

    wallet = FarmerWallet.query.get(new_order.farmer_id)

    if not wallet:
        wallet = FarmerWallet(farmer_id=new_order.farmer_id, balance=0)
        db.session.add(wallet)
        db.session.commit()

    return jsonify({"success": True, "order_id": new_order.id, "amount": total_amount})


@app.route("/api/ai/recommended-crops/<buyer_id>")
def recommend(buyer_id):

    # Get crops buyer purchased before
    purchased = (
        db.session.query(Crop.name)
        .join(Order, Order.crop_id == Crop.id)
        .filter(Order.buyer_id == buyer_id)
        .all()
    )

    preferred = [p[0] for p in purchased]

    # debug

    buyer = Buyer.query.filter_by(public_id=buyer_id).first()

    if not buyer:
        return jsonify([])

    crops = (
        db.session.query(Crop)
        .join(Farmer)
        .filter(Crop.status == "Active", Farmer.district == buyer.district)
        .all()
    )

    ranked = []

    for c in crops:
        score = 0

        if c.name in preferred:
            score += 10  # strong boost

        if c.quantity >= 30:
            score += 3  # freshness boost

        ranked.append(
            {
                "id": c.id,
                "name": c.name,
                "price": c.price,
                "quantity": c.quantity,
                "farmer_id": c.farmer_id,
                "photos": c.photos,  # ⭐ ADD THIS
                "score": score,
            }
        )

    ranked.sort(key=lambda x: x["score"], reverse=True)

    return jsonify(ranked)


@app.route("/api/farmer/bank-details/<farmer_id>", methods=["POST"])
def save_bank_details(farmer_id):

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON data"}), 400

        account_holder = data.get("account_holder_name")
        account_number = data.get("account_number")
        bank_name = data.get("bank_name")
        ifsc = data.get("ifsc_code")

        existing = db.session.get(FarmerBankDetails, farmer_id)

        if existing:
            existing.account_holder_name = account_holder
            existing.account_number = account_number
            existing.bank_name = bank_name
            existing.ifsc_code = ifsc

        else:
            bank = FarmerBankDetails(
                farmer_id=farmer_id,
                account_holder_name=account_holder,
                account_number=account_number,
                bank_name=bank_name,
                ifsc_code=ifsc,
            )

            db.session.add(bank)

        db.session.commit()

        return jsonify({"success": True})

    except Exception as e:
        db.session.rollback()
        app.logger.error(e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/farmer/bank-details/<farmer_id>", methods=["GET"])
def get_bank_details(farmer_id):

    bank = db.session.get(FarmerBankDetails, farmer_id)

    if not bank:
        return jsonify({})

    return jsonify(
        {
            "farmer_id": bank.farmer_id,
            "account_holder_name": bank.account_holder_name,
            "account_number": bank.account_number,
            "bank_name": bank.bank_name,
            "ifsc_code": bank.ifsc_code,
        }
    )


@app.route("/api/ai/hybrid_5day", methods=["POST"])
def hybrid_5day():
    load_model()
    data = request.json
    commodity = data.get("commodity", "").strip().lower()
    district = data.get("district", "").strip().lower()

    if not commodity or not district:
        return jsonify({"error": "Missing input"}), 400

    # ✅ Cache key AFTER cleaning input
    cache_key = f"{commodity}_{district}"

    # ✅ Check cache
    if cache_key in prediction_cache:
        cached_time, cached_data = prediction_cache[cache_key]
        if (datetime.now() - cached_time).seconds < 900:
            return jsonify({"next_5_days_prediction": cached_data})

    res = (
        supabase.table("commodity_prices")
        .select("price")
        .eq("commodity", commodity)
        .eq("district", district)
        .order("date", desc=True)
        .limit(30)
        .execute()
    )

    if not res.data or len(res.data) < 7:
        return jsonify({"error": "Need at least 7 days of data"}), 400

    try:
        prices = [float(r["price"]) for r in reversed(res.data)]

        # ARIMA
        series = pd.Series(prices)
        arima_model = ARIMA(series, order=(1, 1, 1))
        arima_fit = arima_model.fit()
        arima_forecast = arima_fit.forecast(steps=5)

        # Match encoders
        commodity_match = next(
            (c for c in le_commodity.classes_ if c.lower() == commodity), None
        )
        district_match = next(
            (d for d in le_district.classes_ if d.lower() == district), None
        )

        if not commodity_match or not district_match:
            return jsonify({"error": "Invalid commodity or district"}), 400

        commodity_encoded = le_commodity.transform([commodity_match])[0]
        district_encoded = le_district.transform([district_match])[0]

        lag_1 = prices[-1]
        lag_7 = prices[-7]
        rolling_2 = np.mean(prices[-2:])
        rolling_7 = np.mean(prices[-7:])

        rf_predictions = []
        today = datetime.now()

        for i in range(5):
            future_date = today + timedelta(days=i + 1)

            X = pd.DataFrame(
                [
                    {
                        "district_n": district_encoded,
                        "commodity_n": commodity_encoded,
                        "month": future_date.month,
                        "day": future_date.day,
                        "day_of_week": future_date.weekday(),
                        "lag_1": lag_1,
                        "lag_7": lag_7,
                        "rolling_2": rolling_2,
                        "rolling_7": rolling_7,
                    }
                ]
            )

            pred = rf_model.predict(X)[0]
            rf_predictions.append(float(pred))

            prices.append(pred)
            lag_1 = pred
            rolling_2 = np.mean(prices[-2:])
            rolling_7 = np.mean(prices[-7:])

        # Hybrid combine
        final_predictions = []

        for i in range(5):
            arima_value = float(arima_forecast.iloc[i])
            rf_value = rf_predictions[i]

            hybrid_value = 0.7 * arima_value + 0.3 * rf_value
            hybrid_value = round(max(1, hybrid_value))
            final_predictions.append(int(hybrid_value))

        # ✅ SAVE CACHE (ONLY HERE)
        prediction_cache[cache_key] = (datetime.now(), final_predictions)

        return jsonify({"next_5_days_prediction": final_predictions})

    except Exception as e:
        app.logger.error(e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/delete/<int:note_id>", methods=["DELETE"])
def delete_notification(note_id):
    try:
        note = db.session.get(Notification, note_id)

        if not note:
            return jsonify({"error": "Not found"}), 404

        db.session.delete(note)
        db.session.commit()

        return jsonify({"success": True})

    except Exception as e:
        db.session.rollback()
        app.logger.error(e)
        return jsonify({"error": "Server error"}), 500


@app.route("/api/notifications/clear-seen/<buyer_id>", methods=["DELETE"])
def clear_seen_notifications(buyer_id):
    try:
        Notification.query.filter_by(
            user_id=buyer_id, role="buyer", is_read=True
        ).delete()

        db.session.commit()

        return jsonify({"success": True})

    except Exception as e:
        db.session.rollback()
        app.logger.error(e)
        return jsonify({"error": "Server error"}), 500


@app.route("/api/demand")
def demand_stats():
    today = datetime.now(timezone.utc).date()
    demand = (
        db.session.query(
            SearchLog.commodity, func.sum(SearchLog.count).label("searches")
        )
        .filter_by(date=today)
        .group_by(SearchLog.commodity)
        .all()
    )

    results = []

    for commodity, searches in demand:
        supply = Crop.query.filter(
            Crop.name.ilike(commodity), Crop.status == "Active"
        ).count()

        supply_safe = max(supply, 1)
        score = searches / supply_safe
        results.append(
            {
                "commodity": commodity,
                "searches": searches,
                "active_posts": supply,
                "demand_score": round(score, 2),
            }
        )

    return jsonify(results)


@app.route("/api/ai/dynamic-price", methods=["POST"])
def dynamic_price():
    today = datetime.now(timezone.utc).date()

    data = request.json
    commodity = data.get("commodity").strip().lower()
    district = data.get("district").strip().lower()

    if not commodity or not district:
        return jsonify({"error": "Commodity and district required"}), 400
    demand = (
        db.session.query(func.sum(SearchLog.count))
        .join(Buyer, Buyer.public_id == SearchLog.buyer_id)
        .filter(
            SearchLog.commodity == commodity,
            SearchLog.date == today,
            Buyer.district == district,
        )
        .scalar()
        or 0
    )

    supply = (
        db.session.query(Crop)
        .join(Farmer)
        .filter(
            Crop.name.ilike(commodity),
            Crop.status == "Active",
            Farmer.district.ilike(district),
        )
        .count()
    )

    supply_safe = max(supply, 1)
    demand_score = demand / supply_safe

    # 🔥 Fetch from Supabase
    try:
        real_price = fetch_real_market_price(commodity, district)
    except Exception as e:
        app.logger.error(e)
        real_price = None

    if real_price is None:
        return (
            jsonify(
                {"error": f"No real-time price found for {commodity} in {district}"}
            ),
            404,
        )

    # 🟢 If no demand → pure market price
    if demand == 0:
        return jsonify(
            {
                "source": "market",
                "base_price": round(real_price, 2),
                "final_price": round(real_price, 2),
                "trend": "low",
            }
        )

    # 🤖 AI adjustment
    final_price = real_price

    if demand_score < 1:
        # low demand → drop price
        final_price = real_price * (1 - min(0.2, (1 - demand_score) * 0.1))

    elif demand_score <= 3:
        # medium demand → small rise
        final_price = real_price * (1 + demand_score * 0.03)

    else:
        # high demand → strong rise
        final_price = real_price * (1 + min(0.3, demand_score * 0.05))

    recommendation = "Sell Today"

    if demand_score > 1:
        recommendation = "Hold for 2 day(s)"

    return jsonify(
        {
            "source": "ai",
            "base_price": round(real_price, 2),
            "demand_score": round(demand_score, 2),
            "final_price": round(final_price, 2),
            "recommendation": recommendation,
            "trend": (
                "high" if demand_score > 3 else "medium" if demand_score > 1 else "low"
            ),
        }
    )


@app.route("/api/search-log", methods=["POST"])
def track_search():
    data = request.json

    buyer_id = data["buyer_id"]
    commodity = data["commodity"].strip().lower()
    today = datetime.now(timezone.utc).date()

    record = SearchLog.query.filter_by(
        buyer_id=buyer_id, commodity=commodity, date=today
    ).first()

    if record:
        record.count += 1
    else:
        record = SearchLog(buyer_id=buyer_id, commodity=commodity, date=today, count=1)
        db.session.add(record)

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/buyer/profile-image/<public_id>", methods=["POST"])
def upload_buyer_profile_image(public_id):
    user = Buyer.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    image = request.json.get("image")

    if not image:
        return jsonify({"error": "No image"}), 400

    user.profile_image = image
    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/buyer/update-profile/<public_id>", methods=["POST"])
def update_buyer_profile(public_id):
    user = Buyer.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json
    user.name = data.get("name", user.name)
    user.district = data.get("district", user.district)
    user.village = data.get("village", user.village)

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/farmer/wallet/<farmer_id>")
def farmer_wallet(farmer_id):

    wallet = FarmerWallet.query.get(farmer_id)

    if not wallet:
        return jsonify({"balance": 0})

    return jsonify({"balance": round(wallet.balance, 2)})


@app.route("/api/ai/forecast", methods=["POST"])
def ai_forecast():

    data = request.json
    commodity = data["commodity"].strip().lower()
    district = data["district"].strip().lower()

    try:
        res = (
            supabase.table("commodity_prices")
            .select("price")
            .eq("commodity", commodity)
            .eq("district", district)
            .order("date", desc=True)
            .limit(5)
            .execute()
        )
    except Exception as e:
        app.logger.error(e)
        return jsonify({"error": "Market data service unavailable"}), 503

    if not res.data:
        return jsonify(
            [
                {"day": 1, "price": 0},
                {"day": 2, "price": 0},
                {"day": 3, "price": 0},
                {"day": 4, "price": 0},
                {"day": 5, "price": 0},
            ]
        )

    if len(res.data) < 3:
        prices = [float(r["price"]) for r in res.data]
        return jsonify([{"day": i + 1, "price": p} for i, p in enumerate(prices)])

    # 🔹 Convert to pandas series
    prices = [float(r["price"]) for r in res.data]

    series = pd.Series(prices)

    # 🔹 Train ARIMA
    model = ARIMA(series, order=(1, 1, 1))
    model_fit = model.fit()

    # 🔹 Predict next 7 days
    forecast = model_fit.forecast(steps=5)

    results = [
        {"day": i + 1, "price": round(float(p), 2)} for i, p in enumerate(forecast)
    ]

    return jsonify(results)


@app.route("/api/market/highest-crop/<district>")
def highest_crop(district):

    res = (
        supabase.table("commodity_prices")
        .select("commodity, price")
        .ilike("district", district)
        .order("price", desc=True)
        .limit(5)
        .execute()
    )

    if not res.data:
        return jsonify({"error": "No market data"}), 404

    top = res.data[0]

    graph = [
        {
            "name": r["commodity"],
            "price": round(float(r["price"])),  # 👈 removes decimals
        }
        for r in res.data
    ]

    return jsonify(
        {
            "top_crop": top["commodity"],
            "top_price": round(float(top["price"])),
            "graph": graph,
        }
    )


@app.route("/api/buyer/favorites", methods=["POST"])
def add_favorite():
    data = request.json

    existing = Favorite.query.filter_by(
        buyer_id=data["buyer_id"], crop_id=data["crop_id"]
    ).first()

    if existing:
        return jsonify({"success": True})

    new_fav = Favorite(buyer_id=data["buyer_id"], crop_id=data["crop_id"])

    db.session.add(new_fav)
    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/buyer/favorites/<int:crop_id>/<buyer_id>", methods=["DELETE"])
def remove_favorite(crop_id, buyer_id):

    fav = Favorite.query.filter_by(buyer_id=buyer_id, crop_id=crop_id).first()

    if fav:
        db.session.delete(fav)
        db.session.commit()

    return jsonify({"success": True})


@app.route("/api/farmer/update-profile/<public_id>", methods=["POST"])
def update_profile(public_id):
    user = Farmer.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json

    user.name = data.get("name", user.name)
    user.district = data.get("district", user.district)
    user.village = data.get("village", user.village)

    db.session.commit()  # 🔥 THIS IS WHAT MOST PEOPLE MISS

    return jsonify({"success": True})


@app.route("/api/farmer/profile/<public_id>")
def get_farmer_profile(public_id):
    user = Farmer.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(
        {
            "public_id": user.public_id,
            "name": user.name,
            "phone": user.phone,
            "district": user.district,
            "state": user.state,
            "village": user.village,
            "profile_image": user.profile_image,  # ✅ ADD
            "created_at": user.created_at.isoformat(),
        }
    )


@app.route("/api/buyer/profile/<public_id>")
def buyer_profile(public_id):
    buyer = Buyer.query.filter_by(public_id=public_id).first()

    if not buyer:
        return jsonify({"error": "Buyer not found"}), 404

    return jsonify(
        {
            "public_id": buyer.public_id,
            "name": buyer.name,
            "phone": buyer.phone,
            "district": buyer.district,
            "state": buyer.state,
            "village": buyer.village,
            "profile_image": buyer.profile_image,
            "created_at": buyer.created_at.isoformat(),
        }
    )


@app.route("/api/notifications/mark-read/<buyer_id>", methods=["POST"])
def mark_notifications_read(buyer_id):

    Notification.query.filter_by(user_id=buyer_id, role="buyer", is_read=False).update(
        {"is_read": True}
    )

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/crop/<int:crop_id>", methods=["DELETE"])
def delete_crop(crop_id):
    crop = Crop.query.get(crop_id)
    if not crop:
        return jsonify({"error": "Not found"}), 404

    # Clean up favorites so the buyer page doesn't crash
    Favorite.query.filter_by(crop_id=crop_id).delete()

    db.session.delete(crop)
    db.session.commit()
    return jsonify({"success": True})


@app.route("/api/farmer/payments/<public_id>")
def farmer_payments(public_id):

    user = Farmer.query.filter_by(public_id=public_id).first()
    if not user:
        return jsonify({"total": 0, "thisMonth": 0, "pending": 0, "transactions": []})

    # ✅ get all orders for this farmer
    orders = Order.query.filter_by(farmer_id=public_id).order_by(Order.id.desc()).all()

    # ✅ calculate totals
    total = (
        db.session.query(func.sum(Order.amount))
        .filter_by(farmer_id=public_id, status="Completed")
        .scalar()
        or 0
    )

    pending = (
        db.session.query(func.sum(Order.amount))
        .filter(
            Order.farmer_id == public_id,
            Order.status.in_(["Pending Payment", "Escrow Held"]),
        )
        .scalar()
        or 0
    )

    transactions = [
        {
            "id": o.id,
            "buyer": "Market Buyer",
            "crop": "Farm Produce",
            "amount": o.amount,
            "date": "Recent",
            "status": o.status,
            "method": "UPI" if o.status == "Completed" else "Pending",
        }
        for o in orders
    ]

    return jsonify(
        {
            "total": round(total, 2),
            "thisMonth": round(total, 2),
            "pending": round(pending, 2),
            "transactions": transactions,
        }
    )


@app.route("/api/farmer/crops/<public_id>")
def farmer_crops(public_id):

    user = Farmer.query.filter_by(public_id=public_id).first()
    if not user:
        return jsonify([])

    crops = Crop.query.filter_by(farmer_id=public_id).order_by(Crop.id.desc()).all()

    return jsonify(
        [
            {
                "id": c.id,
                "name": c.name,
                "qty": c.quantity,
                "price": c.price,
                "status": c.status,
                "photos": c.photos,  # ⭐ ADD THIS
                "views": random.randint(20, 500),
                "date": c.created_at.strftime("%d %b %Y"),
            }
            for c in crops
        ]
    )


@app.route("/send-login-otp", methods=["POST"])
def send_login_otp():
    data = request.json
    phone = data.get("phone")
    role = data.get("role")

    if not phone or not role:
        return jsonify({"error": "Phone and role required"}), 400

    # ✅ validate role
    if role not in ["farmer", "buyer"]:
        return jsonify({"error": "Invalid role"}), 400

    # ✅ get user properly
    user = get_user_by_role(role, phone)

    if not user:
        return jsonify({"error": "Phone not registered"}), 404

    otp = random.randint(1000, 9999)

    # store per role + phone (safe)
    otp_store[f"{role}_{phone}"] = otp

    return jsonify({"message": "OTP sent"}), 200


@app.route("/verify-login-otp", methods=["POST"])
def verify_login_otp():
    data = request.json
    phone = data.get("phone")
    otp = data.get("otp")
    role = data.get("role")

    key = f"{role}_{phone}"

    if otp_store.get(key) == int(otp):
        otp_store.pop(key)

        user = get_user_by_role(role, phone)

        return jsonify(
            {"verified": True, "user": {"public_id": user.public_id, "name": user.name}}
        )

    return jsonify({"error": "Incorrect OTP"}), 400


@app.route("/api/farmer/dashboard/<public_id>")
def farmer_dashboard(public_id):

    user = Farmer.query.filter_by(public_id=public_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    farmer_id = public_id

    total_earnings = (
        db.session.query(func.sum(Order.amount))
        .filter_by(farmer_id=farmer_id, status="Completed")
        .scalar()
        or 0
    )

    active_listings = Crop.query.filter_by(farmer_id=farmer_id, status="Active").count()

    orders_pending = Order.query.filter(
        Order.farmer_id == farmer_id,
        Order.status.in_(["Pending Payment", "Escrow Held"]),
    ).count()

    crops = Crop.query.filter_by(farmer_id=farmer_id, status="Active").all()

    crop_list = [
        {
            "id": c.id,
            "name": c.name,
            "quantity": c.quantity,
            "price": c.price,
            "status": c.status,
        }
        for c in crops
    ]

    if total_earnings > 50000:
        rank = "Top 5%"
    elif total_earnings > 20000:
        rank = "Top 10%"
    else:
        rank = "Growing"
    reviews = Review.query.filter_by(farmer_id=farmer_id).all()

    if reviews:
        avg_rating = round(sum(r.average_rating for r in reviews) / len(reviews), 2)
        total_reviews = len(reviews)
    else:
        avg_rating = 0
        total_reviews = 0
    return jsonify(
        {
            "totalEarnings": round(total_earnings, 2),
            "activeListings": active_listings,
            "ordersPending": orders_pending,
            "marketRank": rank,
            "activeCrops": crop_list,
            "district": user.district,
            "rating": avg_rating,
            "reviewCount": total_reviews,
        }
    )


@app.route("/api/review/<int:order_id>", methods=["POST"])
def submit_review(order_id):

    data = request.json
    quality = data.get("quality")
    freshness = data.get("freshness")
    packaging = data.get("packaging")

    order = Order.query.get(order_id)

    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order.status != "Completed":
        return jsonify({"error": "Order not completed"}), 400

    # Prevent duplicate review
    existing = Review.query.filter_by(order_id=order_id).first()
    if existing:
        return jsonify({"error": "Already reviewed"}), 400

    avg = round((quality + freshness + packaging) / 3, 2)

    review = Review(
        order_id=order.id,
        farmer_id=order.farmer_id,
        buyer_id=order.buyer_id,
        quality=quality,
        freshness=freshness,
        packaging=packaging,
        average_rating=avg,
    )

    db.session.add(review)

    # 🔔 notify farmer about review
    note = Notification(
        user_id=order.farmer_id,
        role="farmer",
        message=f"⭐ Buyer left a review for order #{order.id}.",
    )

    db.session.add(note)

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/farmer/rating/<farmer_id>")
def farmer_rating(farmer_id):

    reviews = Review.query.filter_by(farmer_id=farmer_id).all()

    if not reviews:
        return jsonify({"average": 0, "total_reviews": 0})

    avg = round(sum(r.average_rating for r in reviews) / len(reviews), 2)

    return jsonify({"average": avg, "total_reviews": len(reviews)})


@app.route("/api/notifications/farmer/<farmer_id>")
def farmer_notifications(farmer_id):

    notes = (
        Notification.query.filter_by(user_id=farmer_id, role="farmer")
        .order_by(Notification.id.desc())
        .all()
    )

    return jsonify(
        [
            {
                "id": n.id,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notes
        ]
    )


@app.route("/api/notifications/mark-read/farmer/<farmer_id>", methods=["POST"])
def mark_farmer_notifications_read(farmer_id):

    Notification.query.filter_by(
        user_id=farmer_id, role="farmer", is_read=False
    ).update({"is_read": True})

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/buyer/orders/<buyer_id>")
def buyer_orders(buyer_id):

    orders = Order.query.filter_by(buyer_id=buyer_id).order_by(Order.id.desc()).all()

    result = []

    for o in orders:

        delivery = Delivery.query.filter_by(order_id=o.id).limit(1).first()

        review = Review.query.filter_by(order_id=o.id).limit(1).first()

        result.append(
            {
                "id": o.id,
                "crop": o.crop.name if o.crop else "Deleted Crop",
                "farmer": o.farmer_id,
                "quantity": o.quantity,
                "price": o.crop.price if o.crop else 0,
                "amount": o.amount,
                "status": o.status,
                "delivery_status": delivery.status if delivery else "Processing",
                "payment_method": o.payment_method,
                "payment_status": o.payment_status,
                "reviewed": True if review else False,
            }
        )

    return jsonify(result)


def generate_public_id(role):
    prefix = "fmr" if role == "farmer" else "byr"

    while True:
        pid = f"{prefix}-" + uuid.uuid4().hex[:4]
        exists = (
            Farmer.query.filter_by(public_id=pid).first()
            or Buyer.query.filter_by(public_id=pid).first()
        )
        if not exists:
            return pid


@app.route("/send-register-otp", methods=["POST"])
def send_register_otp():
    phone = request.json.get("phone")

    if not phone:
        return jsonify({"error": "Phone required"}), 400

    # ❗ Block already registered numbers
    if (
        Farmer.query.filter_by(phone=phone).first()
        or Buyer.query.filter_by(phone=phone).first()
    ):
        return jsonify({"error": "Phone already registered"}), 409

    otp = random.randint(1000, 9999)

    otp_store[f"register_{phone}"] = otp

    return jsonify({"message": "OTP sent"}), 200


@app.route("/verify-register-otp", methods=["POST"])
def verify_register_otp():
    phone = request.json.get("phone")
    otp = request.json.get("otp")

    key = f"register_{phone}"

    if not phone or not otp:
        return jsonify({"error": "Phone and OTP required"}), 400

    if otp_store.get(key) == int(otp):
        otp_store.pop(key)
        return jsonify({"verified": True}), 200

    return jsonify({"error": "Incorrect OTP"}), 400


@app.route("/register", methods=["POST"])
def register():
    data = request.json
    role = data.get("role")

    phone = data.get("phone")

    # check across BOTH tables
    existing_farmer = Farmer.query.filter_by(phone=phone).first()
    existing_buyer = Buyer.query.filter_by(phone=phone).first()
    if role not in ["farmer", "buyer"]:
        return jsonify({"error": "Invalid role"}), 400

    if existing_farmer or existing_buyer:
        return jsonify({"error": "Phone already registered"}), 409

    public_id = generate_public_id(role)

    if role == "farmer":

        user = Farmer(
            public_id=public_id,
            name=data["name"],
            phone=phone,
            password=data["password"],
            district=data["district"],
            state=data["state"],
            village=data["village"],
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
        )

        bank = FarmerBankDetails(
            farmer_id=public_id,
            account_holder_name=data.get("account_holder_name"),
            account_number=data.get("account_number"),
            bank_name=data.get("bank_name"),
            ifsc_code=data.get("ifsc_code"),
        )

        db.session.add(user)
        db.session.add(bank)

        db.session.commit()

        return (
            jsonify({"message": "Registered successfully", "public_id": public_id}),
            201,
        )

    elif role == "buyer":
        user = Buyer(
            public_id=public_id,
            name=data["name"],
            phone=phone,
            password=data["password"],
            district=data["district"],
            state=data["state"],
            village=data["village"],
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
        )

    else:
        return jsonify({"error": "Invalid role"}), 400

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Registered successfully"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    phone = data.get("phone")
    password = data.get("password")
    role = data.get("role")

    # ✅ role validation
    if role not in ["farmer", "buyer"]:
        return jsonify({"error": "Invalid role"}), 400

    if not phone or not password:
        return jsonify({"error": "Phone and password required"}), 400

    user = get_user_by_role(role, phone)

    if not user or user.password != password:
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify(
        {"user": {"public_id": user.public_id, "name": user.name, "phone": user.phone}}
    )


@app.route("/api/marketplace/crops")
def marketplace_crops():
    crops = Crop.query.filter_by(status="Active").order_by(Crop.id.desc()).all()

    return jsonify(
        [
            {
                "id": c.id,
                "name": c.name,
                "quantity": c.quantity,
                "price": c.price,
                "farmer_id": c.farmer_id,
                "photos": c.photos,
            }
            for c in crops
        ]
    )


@app.route("/api/get-location-details", methods=["POST"])
def get_location_details():

    load_pincodes()  # ← load only when needed

    data = request.json
    lat = data.get("lat")
    lng = data.get("lng")

    if lat is None or lng is None:
        return jsonify({"error": "Latitude and Longitude required"}), 400

    point = Point(lng, lat)

    matches = pincodes[pincodes.geometry.intersects(point)]

    if not matches.empty:
        row = matches.iloc[0]

        return jsonify(
            {
                "pincode": row["Pincode"],
                "district": row["Division"],
                "state": row["Circle"],
                "office": row["Office_Name"],
            }
        )

    return jsonify({"error": "Location not found"}), 404


@app.route("/api/confirm-delivery/<int:order_id>", methods=["POST"])
def confirm_delivery(order_id):

    order = Order.query.get(order_id)

    if not order:
        return jsonify({"error": "Order not found"}), 404

    order.status = "Completed"

    db.session.commit()

    return jsonify({"success": True})


@app.route("/api/crop", methods=["POST"])
def create_crop():
    data = request.json

    if not data or data.get("quantity", 0) <= 0:
        return jsonify({"error": "Quantity must be positive"}), 400

    if data.get("price", 0) <= 0:
        return jsonify({"error": "Price must be positive"}), 400

    farmer = Farmer.query.get(data["farmer_id"])
    if not farmer:
        return jsonify({"error": "Invalid farmer"}), 400

    if not farmer.latitude or not farmer.longitude:
        return jsonify({"error": "Farmer location missing"}), 400

    photos = data.get("photos", [])

    new_crop = Crop(
        farmer_id=data["farmer_id"],
        name=data["name"],
        quantity=data["quantity"],
        price=data["price"],
        status="Active",
        photos=photos,  # ⭐ ADD THIS
    )

    db.session.add(new_crop)
    db.session.commit()

    return jsonify({"success": True})


if __name__ == "__main__":

    with app.app_context():
        db.create_all()

    app.run(debug=False, threaded=True)
