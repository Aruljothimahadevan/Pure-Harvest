
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./common/Login";
import FarmerDashboard from "./farmer/FarmerDashboard";
import FarmerPost from "./farmer/FarmerPost";
import Profile from "./farmer/FarmerProfile";
import MyCrops from "./farmer/MyCrops";
import Register from "./common/Register";
import BuyerDashboard from "./buyer/BuyerDashboard";
import BuyerOrders from "./buyer/BuyerOrders";
import BuyerFavorites from "./buyer/BuyerFavorites";
import BuyerProfile from "./buyer/BuyerProfile";
import PaymentPage from "./payment/PaymentPage";
import FakeUPI from "./payment/FakeUPI";
import FakeCard from "./payment/FakeCard";
import FakeNetBanking from "./payment/FakeNetBanking";
import BuyerLogistics from "./buyer/BuyerLogistics";
import FarmerPayments from "./farmer/FarmerPayments";

function App() {
  return (
    <Router>
      <Routes>

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Farmer */}
        <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
        <Route path="/post-crop" element={<FarmerPost />} />
        <Route path="/farmer-profile" element={<Profile />} />
        <Route path="/my-crops" element={<MyCrops />} />
        <Route path="/payments" element={<FarmerPayments />} />
        {/* Buyer */}
        <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
        <Route path="/buyer-orders" element={<BuyerOrders />} />
        <Route path="/buyer-favorites" element={<BuyerFavorites />} />
        <Route path="/buyer-profile" element={<BuyerProfile />} />
        <Route path="/buyer-logistics" element={<BuyerLogistics />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/pay/upi" element={<FakeUPI />} />
        <Route path="/pay/card" element={<FakeCard />} />
        <Route path="/pay/netbanking" element={<FakeNetBanking />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </Router>
  );
}

export default App;
