import React, { createContext, useContext, useEffect, useState } from "react";
import type { IUser } from "../assets/assets";
import api from "../configs/api";
import toast from "react-hot-toast";

interface AuthContextProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  user: IUser | null;
  setUser: (user: IUser | null) => void;
  login: (user: { email: string; password: string }) => Promise<void>;
  signUp: (user: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  user: null,
  setUser: () => {},
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // ================= SIGNUP =================
  const signUp = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
      });

      const data = res?.data;

      if (data?.user) {
        setUser(data.user as IUser);
        setIsLoggedIn(true);
        toast.success(data.message || "Signup successful");
      } else {
        toast.error("Signup failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong during signup");
    }
  };

  // ================= LOGIN =================
  const login = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      const data = res?.data;

      if (data?.user) {
        setUser(data.user as IUser);
        setIsLoggedIn(true);
        toast.success(data.message || "Login successful");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (error) {
      console.error(error);
      toast.error("Invalid email or password");
    }
  };

  // ================= LOGOUT =================
  const logout = async () => {
    try {
      const res = await api.post("/api/auth/logout");

      const data = res?.data;

      setUser(null);
      setIsLoggedIn(false);

      toast.success(data?.message || "Logged out");
    } catch (error) {
      console.error(error);
      toast.error("Logout failed");
    }
  };

  // ================= FETCH USER =================
  const fetchUser = async () => {
    try {
      const res = await api.get("/api/auth/verify");

      const data = res?.data;

      if (data?.user) {
        setUser(data.user as IUser);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("User not authenticated");
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  // Run on app load
  useEffect(() => {
    fetchUser();
  }, []);

  const value = {
    user,
    setUser,
    isLoggedIn,
    setIsLoggedIn,
    signUp,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = () => useContext(AuthContext);