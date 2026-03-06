import { useState, useRef } from "react";
import { useEffect } from "react";

export default function Register() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [location, setLocation] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showOtpInputs, setShowOtpInputs] = useState(false);
    const [otp, setOtp] = useState(new Array(4).fill(""));
    const otpRefs = useRef<HTMLInputElement[]>([]);
    const [otpTimer, setOtpTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [formError, setFormError] = useState("");
    const [role, setRole] = useState<"farmer" | "buyer">("farmer");
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [accountHolder, setAccountHolder] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [bankName, setBankName] = useState("");
    const [ifsc, setIfsc] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);


    const handleRegister = async () => {

        if (!name || !phone || !location || !password || !otpVerified) {
            setFormError("Please fill all required fields");
            return;
        }

        if (password.length < 6) {
            setFormError("Password must be at least 6 characters");
            return;
        }
        if (role === "farmer") {
            if (!accountHolder || !accountNumber || !bankName || !ifsc) {
                setFormError("Please fill bank details");
                return;
            }
        }
        try {
            const res = await fetch("https://pure-harvest.onrender.com/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role,
                    name,
                    phone,
                    password,
                    district: location,
                    state: "Tamil Nadu",
                    village: location,
                    latitude,
                    longitude,
                    account_holder_name: accountHolder,
                    account_number: accountNumber,
                    bank_name: bankName,
                    ifsc_code: ifsc
                })


            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Registration failed");
                return;
            }

            setFormError("");
            setShowSuccess(true);


        } catch {
            setFormError("Server not reachable");
        }
    };

    useEffect(() => {
        if (!showOtpInputs || canResend || otpVerified) return;

        const timer = setInterval(() => {
            setOtpTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanResend(true);
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showOtpInputs, canResend, otpVerified]);

    const getLocationAuto = () => {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                setLatitude(lat);
                setLongitude(lng);

                // 🔥 CALL YOUR BACKEND INSTEAD OF NOMINATIM
                const res = await fetch("https://pure-harvest.onrender.com/api/get-location-details", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ lat, lng })
                });

                const data = await res.json();

                if (data.error) {
                    setLocation("Location not found");
                } else {
                    setLocation(data.district);   // 🔥 district from GeoJSON
                }
            },
            () => {
                alert("Location permission denied");
            }
        );
    };
    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
        const value = e.target.value.replace(/[^0-9]/g, "");
        const newOtp = [...otp];
        newOtp[i] = value;
        setOtp(newOtp);

        if (value && i < otp.length - 1) {
            otpRefs.current[i + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) {
            otpRefs.current[i - 1]?.focus();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-lime-100">
            <div className={`bg-white p-8 rounded-3xl shadow-xl ${role === "farmer" ? "w-[500px]" : "w-[360px]"}`}>

                <h2 className="text-3xl font-bold text-green-700 text-center">
                    🌾 Create Account
                </h2>

                <div className="mt-6 space-y-4">
                    <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                        <button
                            onClick={() => setRole("farmer")}
                            className={`flex-1 py-2 rounded-xl ${role === "farmer" ? "bg-green-600 text-white" : "text-gray-600"}`}
                        >
                            🌾 Farmer
                        </button>
                        <button
                            onClick={() => setRole("buyer")}
                            className={`flex-1 py-2 rounded-xl ${role === "buyer" ? "bg-green-600 text-white" : "text-gray-600"}`}
                        >
                            🏪 Buyer
                        </button>
                    </div>

                    <input
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setFormError("");
                        }}

                        placeholder="Full Name"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                    />

                    {/* Phone + Get Code UI only */}
                    <div>

                        <div className="flex items-center gap-3">

                            <div className="flex border rounded-xl focus-within:ring-2 focus-within:ring-green-600 w-[75%]">
                                <span className="px-3 flex items-center text-gray-600">+91</span>

                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value.replace(/[^0-9]/g, ""));
                                        setOtpError("");
                                        setFormError("");
                                    }}

                                    placeholder="Mobile number"
                                    className="flex-1 p-3 outline-none rounded-r-xl bg-transparent"
                                />
                            </div>

                            {!otpVerified && (
                                <button
                                    onClick={async () => {
                                        if (phone.length !== 10) {
                                            setOtpError("Enter valid 10 digit mobile number");
                                            return;
                                        }

                                        if (showOtpInputs && !canResend) return;

                                        const res = await fetch("https://pure-harvest.onrender.com/send-register-otp", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ phone })
                                        });
                                        const data = await res.json();

                                        if (!res.ok) {
                                            setOtpError(data.error || "Failed to send OTP");
                                            return;
                                        }

                                        // TEMP: show OTP
                                        alert("Your OTP is: " + data.otp);

                                        setShowOtpInputs(true);
                                        setOtp(new Array(4).fill(""));
                                        setOtpVerified(false);
                                        setOtpError("");
                                        setCanResend(false);
                                        setOtpTimer(30);
                                    }}
                                    disabled={showOtpInputs && !canResend}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition
${showOtpInputs && !canResend
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-green-600 text-white hover:bg-green-700"
                                        }`}
                                >
                                    {showOtpInputs
                                        ? canResend
                                            ? "Resend Code"
                                            : `Resend in ${otpTimer}s`
                                        : "Get Code"}
                                </button>

                            )}

                        </div>

                        {/* ✅ Error now properly below phone row */}
                        {otpError && !showOtpInputs && (
                            <p className="text-red-500 text-xs mt-1 ml-2">
                                {otpError}
                            </p>
                        )}

                    </div>


                    {showOtpInputs && (
                        <div className="mt-2">

                            {/* OTP boxes + verify button row */}
                            <div className="flex items-center justify-center gap-3">

                                {otp.map((_, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => {
                                            if (el) otpRefs.current[i] = el;
                                        }}
                                        disabled={otpVerified}
                                        maxLength={1}
                                        value={otp[i]}
                                        onChange={(e) => handleOtpChange(e, i)}
                                        onKeyDown={(e) => handleOtpKeyDown(e, i)}
                                        className={`w-10 h-10 border rounded-lg text-center text-lg
focus:outline-none focus:ring-2 focus:ring-green-600
${otpVerified ? "bg-gray-200 cursor-not-allowed" : ""}`}
                                    />
                                ))}

                                <button
                                    onClick={async () => {
                                        const res = await fetch("https://pure-harvest.onrender.com/verify-register-otp", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                phone,
                                                otp: otp.join("")
                                            })
                                        });


                                        if (res.ok) {
                                            setOtpVerified(true);
                                            setOtpError("");
                                        } else {
                                            setOtpError("Incorrect code");
                                        }
                                    }}
                                    className={`ml-2 px-4 py-2 rounded-lg text-sm font-semibold
${otpVerified
                                            ? "bg-green-600 text-white cursor-default"
                                            : "bg-green-600 text-white hover:bg-green-700"}`}
                                >
                                    {otpVerified ? "✅" : "Verify"}
                                </button>

                            </div>

                            {/* Error BELOW OTP */}
                            {otpError && (
                                <p className="text-red-500 text-sm text-center mt-1">
                                    {otpError}
                                </p>
                            )}

                        </div>
                    )}
                    {/* OTP */}
                    <div className="flex gap-2 items-center">

                        <input
                            value={location}
                            onChange={(e) => {
                                setLocation(e.target.value);
                                setFormError("");
                            }}
                            placeholder="Village / District"
                            className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                        />

                        <button
                            onClick={getLocationAuto}
                            className="px-3 py-2 border border-green-600 text-green-700 rounded-xl text-sm hover:bg-green-50"
                        >
                            Get Location
                        </button>

                    </div>


                    {/* Password */}
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setFormError("");
                            }}
                            placeholder="Create password"
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none pr-10"
                        />

                        <span
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 cursor-pointer text-gray-500 hover:text-green-600 select-none"
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                        Minimum 6 characters required
                    </p>
                    {role === "farmer" && (
                        <div className="mt-2 space-y-3">

                            <h3 className="text-sm font-semibold text-gray-700">
                                Bank Details
                            </h3>

                            <input
                                value={accountHolder}
                                onChange={(e) => setAccountHolder(e.target.value)}
                                placeholder="Account Holder Name"
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                            />

                            <input
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="Account Number"
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                            />

                            <input
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="Bank Name"
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                            />

                            <input
                                value={ifsc}
                                onChange={(e) => setIfsc(e.target.value)}
                                placeholder="IFSC Code"
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                            />

                        </div>
                    )}
                    <button
                        onClick={handleRegister}
                        className="w-full py-3 rounded-xl font-semibold transition 
bg-green-600 text-white hover:bg-green-700"

                    >
                        Register
                    </button>
                    {formError && (
                        <p className="text-red-500 text-sm text-center mt-2">
                            {formError}
                        </p>
                    )}




                    <p className="text-center text-sm">
                        Already have account?{" "}
                        <span
                            onClick={() => (window.location.href = "/login")}
                            className="text-green-700 underline cursor-pointer"
                        >
                            Login
                        </span>
                    </p>

                </div>
            </div>
            {showSuccess && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-[320px] text-center animate-scale">

                        <div className="text-5xl mb-3">✅</div>

                        <h3 className="text-xl font-bold text-green-700">
                            Registration Successful
                        </h3>

                        <p className="text-gray-600 mt-2 text-sm">
                            Your account has been created successfully.
                        </p>

                        <button
                            onClick={() => (window.location.href = "/login")}
                            className="mt-5 w-full py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
                        >
                            Go to Login
                        </button>

                    </div>
                </div>
            )}

        </div>
    );
}

