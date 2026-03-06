import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BuyerTopNavBar from "./BuyerTopNavBar";
import Cropper from "react-easy-crop";
import getCroppedImg from "../utils/cropImage";

export default function BuyerProfile() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [imageSaving, setImageSaving] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [showCropModal, setShowCropModal] = useState(false);

    /* ---------------- LOAD PROFILE ---------------- */

    useEffect(() => {
        const loadProfile = async () => {
            const buyerId = sessionStorage.getItem("buyerId");
            if (!buyerId) {
                navigate("/login");
                return;
            }

            const res = await fetch(`https://pure-harvest.onrender.com/api/buyer/profile/${buyerId}`);

            if (!res.ok) {
                console.error("Profile load failed");
                return;
            }

            const data = await res.json();

            const joinedDate = new Date(data.created_at);
            const memberSince = joinedDate.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric"
            });

            setProfile({ ...data, memberSince });
            setProfileImage(data.profile_image);
        };

        loadProfile();
    }, [navigate]);

    if (!profile) {
        return (
            <div className="min-h-screen pt-24 animate-pulse bg-gray-50 px-6">
                <BuyerTopNavBar />
                <div className="h-48 bg-green-700 rounded-lg" />
                <div className="max-w-md mx-auto mt-20 space-y-6">
                    <div className="h-6 bg-gray-300 rounded w-40 mx-auto" />
                    <div className="bg-white rounded-3xl p-6 space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-5 bg-gray-200 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /* ---------------- IMAGE UPLOAD ---------------- */

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

    const onCropComplete = (_: any, pixels: any) => {
        setCroppedAreaPixels(pixels);
    };

    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            setImageSaving(true);

            const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
            setProfileImage(cropped);

            const buyerId = sessionStorage.getItem("buyerId");

            const res = await fetch(`https://pure-harvest.onrender.com/api/buyer/profile-image/${buyerId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: cropped })
            });

            if (!res.ok) throw new Error("Upload failed");

            sessionStorage.setItem("buyerProfileImage", cropped);
            window.dispatchEvent(new Event("profileUpdated"));

            setShowCropModal(false);
        } catch (err) {
            alert("Image upload failed");
        } finally {
            setImageSaving(false);
        }
    };

    /* ---------------- SAVE PROFILE ---------------- */

    const handleSave = async () => {
        const buyerId = sessionStorage.getItem("buyerId");
        if (!buyerId) return;

        try {
            setSaving(true);

            const res = await fetch(`https://pure-harvest.onrender.com/api/buyer/update-profile/${buyerId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: profile.name,
                    district: profile.district,
                    village: profile.village
                })
            });

            if (!res.ok) throw new Error("Save failed");
            sessionStorage.setItem("buyerName", profile.name);
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

    return (
        <>
            <BuyerTopNavBar />

            <div className="min-h-screen bg-gray-50 pt-16 pb-20">

                {/* HEADER */}
                <div className="h-48 bg-green-700 relative">
                    <h2 className="absolute left-1/2 top-10 -translate-x-1/2 text-3xl font-bold text-white">
                        My Profile
                    </h2>

                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <div className="w-28 h-28 rounded-full bg-white p-1 shadow-xl relative">
                            <img
                                src={
                                    profileImage ||
                                    `https://ui-avatars.com/api/?name=${profile.name}&background=059669&color=fff`
                                }
                                className="rounded-full w-full h-full object-cover"
                            />

                            <label className="absolute bottom-1 right-1 bg-green-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:scale-110 transition">
                                📸
                                <input hidden type="file" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>
                </div>

                <main className="max-w-md mx-auto px-6 mt-20">

                    <div className="text-center mb-8">
                        {isEditing ? (
                            <input
                                value={profile.name}
                                onChange={e => setProfile({ ...profile, name: e.target.value })}
                                className="text-2xl font-bold text-gray-800 text-center border-b-2 border-green-600 outline-none bg-transparent"
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
                        )}
                        <p className="text-green-700 text-sm font-semibold">
                            ID: {profile.public_id}
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">

                        <div className="px-6 py-5 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Your Details</h3>
                            <button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
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

                            <DetailItem label="Mobile Number" value={`+91 ${profile.phone}`} />

                            <DetailItem label="State" value={profile.state} />

                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem
                                    label="District"
                                    value={profile.district}
                                    isEditing={isEditing}
                                    onChange={(v: string) => setProfile({ ...profile, district: v })}
                                />
                                <DetailItem
                                    label="Village"
                                    value={profile.village}
                                    isEditing={isEditing}
                                    onChange={(v: string) => setProfile({ ...profile, village: v })}
                                />
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-gray-400 text-xs mt-6">
                        Member since {profile.memberSince}
                    </p>

                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full mt-8 py-4 rounded-2xl text-red-600 font-bold border-2 border-red-100 hover:bg-red-50"
                    >
                        Log Out
                    </button>
                </main>

                {/* CROP MODAL */}
                {showCropModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-2xl w-[400px]">

                            <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">
                                <Cropper
                                    image={imageSrc!}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
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
                                onChange={e => setZoom(Number(e.target.value))}
                                className="w-full mt-4"
                            />

                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setShowCropModal(false)} className="px-4 py-2 border rounded-lg">
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

                {/* LOGOUT MODAL */}
                {showLogoutConfirm && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 w-72 text-center shadow-xl">
                            <h3 className="font-bold text-lg mb-2">Log out?</h3>
                            <p className="text-sm text-gray-500 mb-6">Are you sure?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2 border rounded-xl">
                                    No
                                </button>
                                <button onClick={confirmLogout} className="flex-1 py-2 bg-red-600 text-white rounded-xl">
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

/* -------- HELPER -------- */

function DetailItem({ label, value, isEditing = false, onChange }: any) {
    return (
        <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">
                {label}
            </label>
            {isEditing ? (
                <input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full mt-1 border-b-2 border-green-600 outline-none font-medium"
                />
            ) : (
                <p className="text-lg font-semibold mt-1">{value}</p>
            )}
        </div>
    );
}