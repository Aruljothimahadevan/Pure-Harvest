import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FarmerNavBar from "./FarmerTopNavBar";
import Cropper from "react-easy-crop";
import getCroppedImg from "../utils/cropImage";
export default function Profile() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [imageSaving, setImageSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [, setReviewCount] = useState(0);
  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };
  useEffect(() => {
    const farmerId = sessionStorage.getItem("farmerId");

    if (!farmerId) {
      navigate("/login");
      return;
    }

    fetch(`http://pure-harvest.onrender.com/api/farmer/profile/${farmerId}`)
      .then(res => res.json())
      .then(async data => {
        const joinedDate = new Date(data.created_at);

        const memberSince = joinedDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric"
        });

        setProfile({
          ...data,
          memberSince
        });

        setProfileImage(data.profile_image);

        // ⭐ FETCH DASHBOARD DATA (same as dashboard page)
        const dashRes = await fetch(
          `http://pure-harvest.onrender.com/api/farmer/dashboard/${farmerId}`
        );
        const dashData = await dashRes.json();

        setRating(dashData.rating);
        setReviewCount(dashData.reviewCount);

        sessionStorage.setItem("userName", data.name);
        sessionStorage.setItem("profileImage", data.profile_image || "");
        window.dispatchEvent(new Event("profileUpdated"));
      });
  }, [navigate]);

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setImageSaving(true);

      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      setProfileImage(croppedImage);

      const farmerId = sessionStorage.getItem("farmerId");

      const res = await fetch(
        `http://pure-harvest.onrender.com/api/farmer/profile-image/${farmerId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: croppedImage })
        }
      );

      if (!res.ok) throw new Error("Upload failed");

      sessionStorage.setItem("profileImage", croppedImage);
      window.dispatchEvent(new Event("profileUpdated"));

      setShowCropModal(false);
    } catch {
      alert("Image upload failed");
    } finally {
      setImageSaving(false);
    }
  };
  /* ---------------- IMAGE UPLOAD FIX ---------------- */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    const farmerId = sessionStorage.getItem("farmerId");
    if (!farmerId) return;

    try {
      setSaving(true);

      const res = await fetch(
        `http://pure-harvest.onrender.com/api/farmer/update-profile/${farmerId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: profile.name,
            district: profile.district,
            village: profile.village
          })
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error("Save failed");

      // ✅ Update navbar instantly
      sessionStorage.setItem("userName", profile.name);
      window.dispatchEvent(new Event("profileUpdated"));

      setIsEditing(false);
    } catch (err) {
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };
  /* ---------------- LOGOUT ---------------- */
  const confirmLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  if (!profile) {
    return (
      <div className="min-h-screen shimmer rounded-50 pt-16 px-6 animate-pulse">
        <FarmerNavBar />

        {/* Header skeleton */}
        <div className="h-48 bg-green-700 relative">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-28 h-28 rounded-full shimmer border-4 border-white float-soft" />        </div>
        </div>

        <div className="max-w-md mx-auto mt-20 space-y-6">

          {/* Name skeleton */}
          <div className="space-y-3 text-center">
            <div className="h-6 shimmer rounded rounded w-40 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-24 mx-auto" />
          </div>

          {/* Card skeleton */}
          <div className="bg-white rounded-3xl p-6 space-y-6 shadow-sm breathe">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="space-y-2 shimmer rounded"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-5 shimmer rounded" />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-5 shimmer rounded rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Button skeleton */}
          <div className="h-12 shimmer rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  const renderStars = () => {
    const stars = [];

    for (let i = 1; i <= 5; i++) {

      if (rating >= i) {
        stars.push(
          <span key={i} className="text-yellow-400 text-3xl drop-shadow-md">★</span>
        );

      } else if (rating >= i - 0.5) {
        stars.push(
          <span key={i} className="text-yellow-400 opacity-70 text-lg">★</span>
        );

      } else {
        stars.push(
          <span key={i} className="text-gray-300 text-lg">★</span>
        );
      }
    }

    return stars;
  };

  return (

    <div className="min-h-screen bg-gray-50 pt-16 pb-16 relative">
      <FarmerNavBar />

      {/* HEADER */}
      <div className="h-48 bg-green-700 relative">
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-28 h-28 rounded-full bg-white p-1 shadow-xl relative">
            <img
              src={
                profileImage ||
                profile.profile_image ||
                `https://ui-avatars.com/api/?name=${profile.name}&background=059669&color=fff`
              }
              className="rounded-full w-full h-full object-cover"
            />

            <label className="absolute bottom-1 right-1 bg-green-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:scale-110 transition">
              📸
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
              />
            </label>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 mt-20">

        {/* NAME */}
        <div className="text-center mb-8">
          {isEditing ? (
            <input
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="text-2xl font-bold text-center border-b-2 border-green-600 outline-none bg-transparent"
            />
          ) : (
            <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
          )}

          <p className="text-green-700 text-sm font-semibold mt-1">
            ID: {profile.public_id}
          </p>

          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex gap-1">
              {renderStars()}
            </div>
          </div>
        </div>

        {/* DETAILS CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="px-6 py-5 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Your Details</h3>
            <button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={saving}
              className={`
    text-green-700 font-bold text-sm transition
    ${saving ? "opacity-60 cursor-not-allowed" : "hover:scale-105"}
  `}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </span>
              ) : isEditing ? "Save" : "Edit"}
            </button>
          </div>

          <div className="p-6 space-y-6">
            <DetailItem
              label="Mobile Number"
              value={`+91 ${profile.phone}`}
              isEditing={false}
            />




            <DetailItem
              label="State"
              value={profile.state}
              isEditing={false}
            />

            <div className="grid grid-cols-2 gap-4">
              <DetailItem
                label="District"
                value={profile.district}
                isEditing={isEditing}
                onChange={(v: string) =>
                  setProfile({ ...profile, district: v })
                }
              />
              <DetailItem
                label="Village"
                value={profile.village}
                isEditing={isEditing}
                onChange={(v: string) =>
                  setProfile({ ...profile, village: v })
                }
              />
            </div>
          </div>
        </div>
        <div className="text-center mt-6">
          <p className="text-gray-400 text-xs uppercase tracking-widest">
            Member since {profile.memberSince}
          </p>
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full mt-8 py-4 rounded-2xl text-red-600 font-bold border-2 border-red-100 hover:bg-red-50 transition"
        >
          Log Out
        </button>
      </main>

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-72 text-center shadow-xl">

            <h3 className="font-bold text-gray-800 text-lg mb-2">
              Log out?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to leave your account?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-xl border text-gray-600 hover:bg-gray-100"
              >
                No
              </button>

              <button
                onClick={confirmLogout}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[400px]">

            <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">              <Cropper
              image={imageSrc!}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"        // 🔥 circle preview
              showGrid={false}        // clean look
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
            </div>

            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full mt-4"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCropModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleCropSave}
                disabled={imageSaving}
                className={`
    px-4 py-2 rounded-lg text-white font-semibold transition
    ${imageSaving ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:scale-105"}
  `}
              >
                {imageSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- HELPER ---------------- */

function DetailItem({ label, value, isEditing, onChange }: any) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase font-semibold">
        {label}
      </label>

      {isEditing ? (
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full mt-1 border-b-2 border-green-600 outline-none font-medium"
        />
      ) : (
        <p className="text-lg font-semibold text-gray-800 mt-1">{value}</p>
      )}

    </div>
  );
}
