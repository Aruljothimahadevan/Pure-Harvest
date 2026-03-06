import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
export default function BuyerTopNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string>("Buyer");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const isNotificationsPage = location.pathname === "/buyer-notifications";
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  useEffect(() => {
    const loadProfile = () => {
      setUserName(sessionStorage.getItem("buyerName") || "Buyer");
      setProfileImage(sessionStorage.getItem("buyerProfileImage"));
    };

    loadProfile();
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
    const buyerId = sessionStorage.getItem("buyerId");
    if (!buyerId) return;

    try {
      const res = await fetch(
        `http://pure-harvest.onrender.com/api/notifications/buyer/${buyerId}`
      );

      if (!res.ok) return;

      const data: NotificationType[] = await res.json();
      setNotifications(data);
      setNotificationCount(data.filter(n => !n.is_read).length);

    } catch (error) {
      console.error("Notification error:", error);
    }
  };

  const deleteNotification = async (id: number) => {
    await fetch(`http://pure-harvest.onrender.com/api/notifications/delete/${id}`, {
      method: "DELETE"
    });

    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  const clearSeen = async () => {
    const buyerId = sessionStorage.getItem("buyerId");
    if (!buyerId) return;

    await fetch(
      `http://pure-harvest.onrender.com/api/notifications/clear-seen/${buyerId}`,
      { method: "DELETE" }
    );

    // remove only seen notifications from UI
    setNotifications(prev => prev.filter(n => !n.is_read));
  };

  useEffect(() => {
    const buyerId = sessionStorage.getItem("buyerId");
    if (!buyerId) return;

    fetchNotifications();

    const interval = setInterval(() => {
      if (!showNotifications) {
        fetchNotifications();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [showNotifications]);
  const links: { label: string; path: string }[] = [
    { label: "Marketplace", path: "/buyer-dashboard" },
    { label: "Orders", path: "/buyer-orders" },
    { label: "Favorites", path: "/buyer-favorites" },
    { label: "Delivery", path: "/buyer-logistics" }
  ];
  return (
    <header className="fixed top-0 left-0 right-0 z-[9999]">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b shadow-sm -z-10" />

      <div className="relative w-full px-12 h-20 flex items-center justify-between">

        {/* LOGO */}
        <motion.div
          onClick={() => navigate("/buyer-dashboard")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <img
            src="/icon.jpg"
            alt="Pure Harvest"
            className="w-10 h-10 object-contain hover:scale-105 transition"
          />
          <span className="text-green-600 font-extrabold text-xl tracking-wide">
            PURE HARVEST
          </span>
        </motion.div>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-4 font-semibold text-lg">

          {/* NOTIFICATION */}
          <div
            onClick={async () => {
              const buyerId = sessionStorage.getItem("buyerId");
              if (!buyerId) return;

              const isOpening = !showNotifications;
              setShowNotifications(isOpening);

              if (isOpening) {

                // 🔥 remove badge instantly
                setNotificationCount(0);

                // 🔥 mark all as read locally
                setNotifications(prev =>
                  prev.map(n => ({ ...n, is_read: true }))
                );

                // 🔥 update backend
                await fetch(
                  `http://pure-harvest.onrender.com/api/notifications/mark-read/${buyerId}`,
                  { method: "POST" }
                );

                // 🔥 refresh after backend update
                fetchNotifications();
              }
            }}
            className="relative cursor-pointer mr-3 flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition"
          >
            <Bell
              className={`w-5 h-5 transition ${isNotificationsPage
                ? "text-green-600"
                : "text-gray-600 hover:text-green-600"
                }`}
            />
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
                  className="absolute top-12 right-[-192px] w-[420px] h-[70vh] bg-white/60 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_rgba(22,163,74,0.25)] border border-gray-200 z-50 flex flex-col">
                  {/* Arrow */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#16A34A] rotate-45"></div>

                  {/* Header */}
                  <div className="p-5 font-bold text-lg bg-[#16A34A] text-white rounded-t-2xl">
                    Notifications
                  </div>

                  {/* Scroll Area */}
                  <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
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

                          {/* DELETE BUTTON */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();   // 🔥 prevents panel closing
                              deleteNotification(note.id);
                            }}
                            className="text-gray-400 hover:text-red-500 text-sm"
                          >
                            ✕
                          </button>

                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
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

          {/* NAV LINKS + DIVIDER */}
          <div className="flex items-center gap-4 pr-4 border-r border-gray-300">
            {links.map(link => {
              const active = location.pathname === link.path;

              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`relative px-2 py-1 ${active
                    ? "text-green-600"
                    : "text-gray-600 hover:text-green-500"
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
            onClick={() => navigate("/buyer-profile")}
            className="flex items-center gap-3 ml-4 p-1 pr-4 rounded-full cursor-pointer hover:bg-gray-50 transition"
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

        </div>

        {/* MOBILE ICON */}
        <div
          onClick={() => setOpen(!open)}
          className="md:hidden text-3xl cursor-pointer"
        >
          ☰
        </div>

      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-white border-t shadow-lg relative z-50">
          {links.map(link => (
            <div
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setOpen(false);
              }}
              className={`px-6 py-4 font-semibold border-b ${location.pathname === link.path
                ? "text-green-600"
                : "text-gray-700"
                }`}
            >
              {link.label}
            </div>
          ))}

          <div
            onClick={() => {
              navigate("/buyer-profile");
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