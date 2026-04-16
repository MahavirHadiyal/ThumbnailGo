import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // ✅ SAFE INITIAL
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <>
      <motion.nav
        className="fixed top-0 z-50 flex items-center justify-between w-full py-4 px-6"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Link to="/">
          <img src="/logo.svg" alt="logo" className="h-8" />
        </Link>

        <div className="hidden md:flex gap-6">
          <Link to="/">HOME</Link>
          <Link to="/generate">Generate</Link>

          {isLoggedIn ? (
            <Link to="/my-generation">My Generations</Link>
          ) : (
            <Link to="#">About</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <div className="relative group">
              <button className="rounded-full size-8 bg-gray-300">
                {initial}
              </button>

              <div className="hidden group-hover:block absolute top-8 right-0">
                <button onClick={logout}>Logout</button>
              </div>
            </div>
          ) : (
            <button onClick={() => navigate("/login")}>
              Get Started
            </button>
          )}

          <button onClick={() => setIsOpen(true)}>
            <MenuIcon />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 bg-black text-white ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <button onClick={() => setIsOpen(false)}>
          <XIcon />
        </button>
      </div>
    </>
  );
}