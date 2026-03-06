import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";


const images = [
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399",
  "https://images.unsplash.com/photo-1500595046743-ddf4d3d753fd",
];

export default function Login() {
  // --- States ---
  const [current, setCurrent] = useState(0);
  const [role, setRole] = useState<"farmer" | "buyer">("farmer");
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpInputs, setShowOtpInputs] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otpError, setOtpError] = useState("");
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const loginBtnRef = useRef<HTMLButtonElement | null>(null);

  // OTP states
  const [otp, setOtp] = useState(new Array(4).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // OTP timer states
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // --- Effects ---

  // Image carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOtpInputs && !canResend) {
      timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpInputs, canResend]);

  // --- Functions ---
  // OTP input change
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");
    if (value && index < otp.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // OTP backspace handling
  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      alert("Enter phone and password");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, role })
      });

      const data = await res.json();
      if (res.ok) {

        // SAVE logged user id (this connects whole app)
        if (role === "farmer") {
          sessionStorage.setItem("farmerId", data.user.public_id);
          sessionStorage.setItem("farmerName", data.user.name);
          sessionStorage.removeItem("buyerId");
        } else {
          sessionStorage.setItem("buyerId", data.user.public_id);
          sessionStorage.setItem("buyerName", data.user.name);
          sessionStorage.removeItem("farmerId");
        }


        sessionStorage.setItem("role", role);



        // go to dashboard
        navigate(role === "farmer" ? "/farmer-dashboard" : "/buyer-dashboard");

        return;
      }
      alert(data.error);
    } catch {
      alert("Server error");
    }
  };
  const handleOtpLogin = async () => {
    if (phone.length !== 10) {
      setOtpError("Enter valid mobile number");
      return;
    }

    if (!showOtpInputs) {
      const res = await fetch("http://127.0.0.1:5000/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, role })
      });

      if (!res.ok) {
        setOtpError("Mobile number not registered");
        return;
      }

      setShowOtpInputs(true);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      setOtp(new Array(4).fill(""));
      setCanResend(false);
      setOtpTimer(30);
      setOtpError("");
    } else {
      const res = await fetch("http://127.0.0.1:5000/verify-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp: otp.join(""),
          role
        })

      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Incorrect code");
        return;
      }
      if (role === "farmer") {
        sessionStorage.setItem("farmerId", data.user.public_id);
        sessionStorage.setItem("farmerName", data.user.name);
        sessionStorage.removeItem("buyerId");
      } else {
        sessionStorage.setItem("buyerId", data.user.public_id);
        sessionStorage.setItem("buyerName", data.user.name);
        sessionStorage.removeItem("farmerId");
      }


      sessionStorage.setItem("role", role);

      navigate(role === "farmer" ? "/farmer-dashboard" : "/buyer-dashboard");

    }
  };


  return (
    <div className="min-h-screen flex">
      {/* LEFT — IMAGE CAROUSEL */}
      <div className="w-1/2 hidden md:block relative">
        <img
          src={images[current]}
          className="h-full w-full object-cover transition-all duration-700"
        />
        <div className="absolute bottom-10 left-10 text-white z-10">
          <h1 className="text-4xl font-bold">🌾 Smart Farming</h1>
          <p className="text-lg">Better prices for every harvest</p>
        </div>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* RIGHT — LOGIN */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white">
        <div className="w-[360px]">
          {/* Title */}
         
            {/* Logo */}
                <div className="flex justify-center mb-4">
                  <img
                    src="/icon.jpg"
                    alt="Pure Harvest Logo"
                    className="w-20 h-20 object-contain"
                  />
                </div>

{/* Title */}
<h2 className="text-3xl font-bold text-green-700 text-center">
  Pure Harvest
</h2>
<p className="text-center text-gray-500 mt-2">Welcome back</p>
          {/* Role Selection */}
          <div className="flex mt-6 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setRole("farmer")}
              className={`flex-1 py-2 rounded-xl font-semibold ${role === "farmer" ? "bg-green-600 text-white" : "text-gray-600"
                }`}
            >
              🌾 Farmer
            </button>
            <button
              onClick={() => setRole("buyer")}
              className={`flex-1 py-2 rounded-xl font-semibold ${role === "buyer" ? "bg-green-600 text-white" : "text-gray-600"
                }`}
            >
              🏪 Buyer
            </button>
          </div>

          {/* Inputs */}
          <div className="mt-6 space-y-4">
            {/* Mobile Number with +91 Prefix */}
            <div className="flex items-center border rounded-xl focus-within:ring-2 focus-within:ring-green-600">
              <span className="px-3 text-gray-600 select-none">+91</span>
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                maxLength={10}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    passwordRef.current?.focus();
                  }
                }}
                placeholder="Enter 10-digit number"
                className="flex-1 p-3 outline-none rounded-r-xl"
              />

            </div>

            {/* Password or OTP Section */}
            {loginMethod === "password" ? (
              // PASSWORD LOGIN
              <div>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        loginBtnRef.current?.focus();
                      }
                    }}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-600 outline-none pr-10"
                  />


                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 cursor-pointer text-gray-500 hover:text-green-600"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </span>
                </div>


              </div>
            ) : (
              // OTP LOGIN
              <div className="text-center mt-4">
                {showOtpInputs && (
                  <>
                    <h3 className="text-green-700 font-semibold mb-3">Enter valid OTP</h3>
                    <div className="flex justify-center gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <input
                          key={index}
                          type="text"
                          maxLength={1}
                          className="w-12 h-12 border rounded-xl text-center text-xl focus:ring-2 focus:ring-green-600 outline-none"
                          ref={(el) => {
                            otpRefs.current[index] = el;
                          }}
                          value={otp[index]}
                          onChange={(e) => handleOtpChange(e, index)}
                          onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        />
                      ))}
                    </div>

                    {/* Countdown / Resend */}
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      {canResend ? (
                        <span
                          className="text-green-700 cursor-pointer"
                          onClick={() => {
                            setOtp(new Array(4).fill(""));
                            setCanResend(false);
                            setOtpTimer(30);
                          }}
                        >
                          Resend OTP
                        </span>
                      ) : (
                        `Resend OTP in ${otpTimer}s`
                      )}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* OTP / Password Toggle */}
            <p
              onClick={() => {
                setShowOtpInputs(false);
                setOtp(new Array(4).fill(""));
                setOtpError("");
                setCanResend(true);
                setOtpTimer(30);
                setLoginMethod(loginMethod === "password" ? "otp" : "password");
              }}

              className="text-sm text-green-700 cursor-pointer"
            >
              {loginMethod === "password" ? "Login via OTP instead" : "Login via Password instead"}
            </p>
            {otpError && (
              <p className="text-red-500 text-sm text-center mt-2">
                {otpError}
              </p>
            )}

            {/* Button */}
            <button
              ref={loginBtnRef}
              disabled={loginMethod === "otp" && showOtpInputs && otp.join("").length !== 4}
              onClick={() => {
                if (loginMethod === "password") {
                  handleLogin();
                } else {
                  handleOtpLogin();
                }
              }}
              className={`w-full py-3 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
  ${otp.join("").length !== 4 && showOtpInputs
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"}`}

            >

              {loginMethod === "password"
                ? "Login"
                : showOtpInputs
                  ? "Verify"
                  : "Send OTP"}
            </button>

          </div>

          {/* Register Link */}
          <p className="text-center text-sm mt-3">
            New user?{" "}
            <span
              onClick={() => navigate("/register")}
              className="text-green-700 underline cursor-pointer"
            >
              Register here
            </span>

          </p>
        </div>
      </div>
    </div>
  );
}
