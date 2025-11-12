import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Helper: safer JSON parse
const safeParse = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

// Helper: dev login wrapper
const devLogin = async ({ role, email }) => {
  try {
    const { data } = await authAPI.devLogin({ role, email });
    if (!data?.token || !data?.user) {
      throw new Error("Invalid response from dev login API");
    }
    return { token: data.token, user: data.user };
  } catch (error) {
    console.error("Dev login error:", error);
    throw new Error(error?.message || "Dev login failed");
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  /** ----------------------------------------
   *  Initialize from localStorage
   * -------------------------------------- */
  useEffect(() => {
    const initializeAuth = () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const storedUser = safeParse(localStorage.getItem("user"));

        if (token && storedUser && typeof storedUser === "object") {
          setUser(storedUser);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  /** ----------------------------------------
   *  Login handler
   * -------------------------------------- */
  const login = useCallback(async (credentials) => {
    if (!credentials) {
      toast.error("Invalid credentials provided");
      throw new Error("Invalid credentials provided");
    }

    setLoading(true);
    try {
      let token, userData;

      if (credentials.dev) {
        if (!credentials.role || !credentials.email) {
          throw new Error("Role and email are required for dev login");
        }
        ({ token, user: userData } = await devLogin(credentials));
      } else {
        if (!credentials.email || !credentials.password) {
          throw new Error("Email and password are required");
        }

        const { data } = await authAPI.login(credentials);
        if (!data?.token || !data?.user) {
          throw new Error("Invalid response from login API");
        }

        token = data.token;
        userData = data.user;
      }

      if (!userData?.id && !userData?._id) {
        throw new Error("Invalid user data: missing user ID");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      toast.success("Login successful!");
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      toast.error(
        error?.response?.data?.message || error?.message || "Login failed"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /** ----------------------------------------
   *  Register handler
   * -------------------------------------- */
  const register = useCallback(async (userData) => {
    if (!userData?.email || !userData?.password) {
      toast.error("Email and password are required");
      throw new Error("Email and password are required");
    }

    setLoading(true);
    try {
      const { data } = await authAPI.register(userData);
      if (!data?.token || !data?.user) {
        throw new Error("Invalid response from registration API");
      }

      if (!data.user?.id && !data.user?._id) {
        throw new Error("Invalid user data: missing user ID");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      toast.success("Registration successful!");
      return data.user;
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Registration failed"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /** ----------------------------------------
   *  Logout
   * -------------------------------------- */
  const logout = useCallback(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
    }
  }, []);

  /** ----------------------------------------
   *  Profile Update
   * -------------------------------------- */
  const updateProfile = useCallback(
    async (data) => {
      if (!user) {
        toast.error("No user logged in");
        throw new Error("No user logged in");
      }
      if (!data || typeof data !== "object") {
        toast.error("Invalid profile data");
        throw new Error("Invalid profile data");
      }

      setLoading(true);
      try {
        const response = await authAPI.updateProfile(data);
        const updatedUser = response?.data?.user || { ...user, ...data };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        toast.success("Profile updated successfully!");
        return updatedUser;
      } catch (error) {
        console.error("Profile update error:", error);

        // Local fallback
        try {
          const updatedUser = { ...user, ...data };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
          toast.success("Profile updated locally!");
          return updatedUser;
        } catch (localError) {
          console.error("Local profile update error:", localError);
          toast.error(
            error?.response?.data?.message ||
              error?.message ||
              "Profile update failed"
          );
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /** ----------------------------------------
   *  Google token storage
   * -------------------------------------- */
  const storeGoogleTokens = useCallback(async (tokens) => {
    if (!tokens) {
      toast.error("Invalid tokens provided");
      throw new Error("Invalid tokens provided");
    }

    setLoading(true);
    try {
      await authAPI.storeGoogleTokens(tokens);
      toast.success("Google authentication configured successfully!");
    } catch (error) {
      console.error("Google tokens storage error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to store Google tokens"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /** ----------------------------------------
   *  Memoized context value
   * -------------------------------------- */
  const value = useMemo(
    () => ({
      user,
      loading,
      isInitialized,
      login,
      register,
      logout,
      updateProfile,
      storeGoogleTokens,
    }),
    [
      user,
      loading,
      isInitialized,
      login,
      register,
      logout,
      updateProfile,
      storeGoogleTokens,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
