import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

export default function TopNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  useEffect(() => {
    const loadProfile = () => {
      setUserName(sessionStorage.getItem("userName") || "User");
      setProfileImage(sessionStorage.getItem("profileImage"));
    };

    loadProfile(); // initial load

    // 🔁 listen for profile updates
    window.addEventListener("profileUpdated", loadProfile);

    return () => {
      window.removeEventListener("profileUpdated", loadProfile);
    };
  }, []);
  type NotificationType = {
    id: number;
    message: string;
    is_read: boolean;
    created_at: string;
  };
  const fetchNotifications = async () => {
    const farmerId = sessionStorage.getItem("farmerId");
    if (!farmerId) return;

    try {
      const res = await fetch(
        `https://pure-harvest.onrender.com/api/notifications/farmer/${farmerId}`
      );

      const data = await res.json();

      setNotifications(data);
      setNotificationCount(data.filter((n: NotificationType) => !n.is_read).length);

    } catch (err) {
      console.error("Notification error:", err);
    }
  };
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      if (!showNotifications) {
        fetchNotifications();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [showNotifications]);
  const links = [
    { label: "Dashboard", path: "/farmer-dashboard" },
    { label: "My Crops", path: "/my-crops" },
    { label: "Payments", path: "/payments" }
  ];
  const deleteNotification = async (id: number) => {

    await fetch(
      `https://pure-harvest.onrender.com/api/notifications/delete/${id}`,
      { method: "DELETE" }
    );

    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      setNotificationCount(updated.filter(n => !n.is_read).length);
      return updated;
    });
  };
  const clearSeen = async () => {

    const farmerId = sessionStorage.getItem("farmerId");
    if (!farmerId) return;

    await fetch(
      `https://pure-harvest.onrender.com/api/notifications/clear-seen/farmer/${farmerId}`,
      { method: "DELETE" }
    );

    setNotifications(prev => prev.filter(n => !n.is_read));

    setNotificationCount(
      notifications.filter(n => !n.is_read).length
    );
  };
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b shadow-sm pointer-events-none -z-10" />

      <div className="relative w-full px-12 h-20 flex items-center justify-between">

        {/* LOGO */}
        <motion.div
          onClick={() => navigate("/farmer-dashboard")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <img
            src="/icon.jpg"
            alt="App Logo"
            className="w-10 h-10 object-contain"
          />          <span className="text-2xl font-black bg-gradient-to-r from-green-700 to-emerald-500 bg-clip-text text-transparent">
            PURE HARVEST
          </span>
        </motion.div>

        {/* NAV */}
        <nav className="hidden md:flex items-center gap-4 font-semibold text-lg">
          {/* NOTIFICATION */}
          <div
            onClick={async () => {

              const farmerId = sessionStorage.getItem("farmerId");
              if (!farmerId) return;

              const isOpening = !showNotifications;
              setShowNotifications(isOpening);

              if (isOpening) {

                setNotificationCount(0);

                setNotifications(prev =>
                  prev.map(n => ({ ...n, is_read: true }))
                );

                await fetch(
                  `https://pure-harvest.onrender.com/api/notifications/mark-read/farmer/${farmerId}`,
                  { method: "POST" }
                );

                fetchNotifications();
              }
            }}
            className="relative cursor-pointer mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <Bell className="w-5 h-5 text-gray-600 hover:text-green-600" />

            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                {notificationCount}
              </span>
            )}

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-12 right-[-192px] w-[420px] h-[70vh] bg-white/60 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_rgba(22,163,74,0.25)] border border-gray-200 z-50 flex flex-col"
                >

                  {/* Arrow */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#16A34A] rotate-45"></div>

                  <div className="p-5 font-bold text-lg bg-[#16A34A] text-white rounded-t-2xl">
                    Notifications
                  </div>

                  <div className="flex-1 overflow-y-auto">

                    {notifications.length === 0 ? (
                      <div className="p-4 text-gray-500 text-center">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 border-b transition flex justify-between items-start
    ${note.is_read
                              ? "bg-white"
                              : "bg-green-50 border-l-4 border-green-600"}
    hover:bg-gray-100`}
                        >

                          <div className="flex gap-3 flex-1">

                            {!note.is_read && (
                              <div className="w-2 h-2 mt-2 rounded-full bg-green-600"></div>
                            )}

                            <div>
                              <div className={`text-sm ${note.is_read
                                ? "text-gray-700"
                                : "text-gray-900 font-semibold"
                                }`}>
                                {note.message}
                              </div>

                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(note.created_at).toLocaleString()}
                              </div>
                            </div>

                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(note.id)
                            }}
                            className="text-gray-400 hover:text-red-500 text-sm"
                          >
                            ✕
                          </button>

                        </div>
                      ))
                    )}

                  </div>
                  <div className="p-4 border-t flex justify-between items-center">

                    <span className="text-sm text-gray-500">
                      {notifications.length} notifications
                    </span>

                    <button
                      onClick={clearSeen}
                      className="text-sm font-semibold text-red-500 hover:text-red-600"
                    >
                      Clear All
                    </button>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-4 pr-4 border-r border-gray-300">
            {links.map(link => {
              const active = location.pathname === link.path;

              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`relative px-2 py-1 ${active ? "text-green-600" : "text-gray-600 hover:text-green-500"
                    }`}
                >
                  {link.label}
                  {active && (
                    <div className="absolute -bottom-1 left-0 right-0 h-[3px] bg-green-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* PROFILE */}
          <div
            onClick={() => navigate("/farmer-profile")}
            className="flex items-center gap-3 ml-4 p-1 pr-4 rounded-full cursor-pointer hover:bg-gray-50"
          >
            <img
              src={
                profileImage ||
                `https://ui-avatars.com/api/?name=${userName}&background=059669&color=fff`
              }
              className="w-10 h-10 rounded-full object-cover border-2 border-green-600"
              alt="profile"
            />
            <span className="font-bold text-gray-700">
              {userName}
            </span>
          </div>
        </nav>

        <div
          onClick={() => setOpen(!open)}
          className="md:hidden text-3xl cursor-pointer"
        >
          ☰
        </div>      </div>
      {open && (
        <div className="md:hidden bg-white border-t shadow-lg relative z-50">
          {links.map(link => (
            <div
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setOpen(false);
              }}
              className={`px-6 py-4 font-semibold border-b 
        ${location.pathname === link.path
                  ? "text-green-600"
                  : "text-gray-700"}`}
            >
              {link.label}
            </div>
          ))}

          <div
            onClick={() => {
              navigate("/farmer-profile");
              setOpen(false);
            }}
            className="px-6 py-4 font-semibold text-gray-700"
          >
            Profile
          </div>
        </div>
      )}
    </header>
  );
}