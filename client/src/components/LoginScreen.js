import React, { useState } from "react";
import { BookOpen, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import ThemeToggle from "./ThemeToggle";

const LoginScreen = () => {
  const { login, register, loading } = useAuth();
  const { isDark } = useTheme();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    year: 1,
    registrationNumber: "",
    facultyId: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role,
          department: form.department.trim(),
          ...(role === "student"
            ? {
                year: Number(form.year),
                registrationNumber: form.registrationNumber.trim(),
              }
            : { facultyId: form.facultyId.trim() }),
        };
        await register(payload);
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-twitter-light-50 dark:bg-twitter-dark-900 transition-colors duration-300 flex items-center justify-center p-6">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Animated Background Orbs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-20 dark:opacity-10 bg-gradient-to-br from-twitter-blue-400 to-twitter-green-400 animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 dark:opacity-10 bg-gradient-to-br from-twitter-purple-500 to-twitter-blue-500 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full blur-3xl opacity-5 bg-gradient-to-br from-twitter-orange-400 to-twitter-yellow-400 animate-pulse" />
      </div>

      <div className="w-full max-w-md">
        <div className="card glass-strong border border-twitter-light-200 dark:border-twitter-dark-700 shadow-2xl p-6 rounded-2xl backdrop-blur-lg bg-white/60 dark:bg-twitter-dark-800/60">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gradient-twitter tracking-tight mb-2">
              HackHub
            </h1>
            <p className="text-twitter-dark-500 dark:text-twitter-dark-300 transition-colors duration-200">
              Centralized Hackathon Management
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center gap-1 mb-6 p-1 bg-twitter-light-100 dark:bg-twitter-dark-800 rounded-full transition-colors duration-200">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                type="button"
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-gradient-twitter text-white shadow-md"
                    : "text-twitter-dark-600 dark:text-twitter-dark-400 hover:text-twitter-blue-500 dark:hover:text-twitter-blue-400"
                }`}
              >
                {m === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2">
                  Role
                </label>
                <div className="flex gap-2">
                  {["student", "faculty"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                        role === r
                          ? "bg-twitter-purple-500 text-white shadow-md"
                          : "bg-twitter-light-100 dark:bg-twitter-dark-700 text-twitter-dark-600 dark:text-twitter-dark-400 hover:bg-twitter-light-200 dark:hover:bg-twitter-dark-600"
                      }`}
                    >
                      {r[0].toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name Field */}
            {mode === "register" && (
              <InputField
                label="Full Name"
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Enter your full name"
                required
              />
            )}

            {/* Email */}
            <InputField
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              required
            />

            {/* Password */}
            <InputField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="••••••••"
              required
            />

            {/* Extra Fields */}
            {mode === "register" && (
              <>
                <InputField
                  label="Department"
                  name="department"
                  value={form.department}
                  onChange={onChange}
                  placeholder="Computer Science"
                  required
                />

                {role === "student" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Year (1–4)"
                      name="year"
                      type="number"
                      min="1"
                      max="4"
                      value={form.year}
                      onChange={onChange}
                      required
                    />
                    <InputField
                      label="Registration Number"
                      name="registrationNumber"
                      value={form.registrationNumber}
                      onChange={onChange}
                      placeholder="REG123"
                      required
                    />
                  </div>
                ) : (
                  <InputField
                    label="Faculty ID"
                    name="facultyId"
                    value={form.facultyId}
                    onChange={onChange}
                    placeholder="FAC123"
                    required
                  />
                )}
              </>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full group relative overflow-hidden rounded-xl px-6 py-4 font-semibold text-white transition-all duration-300 transform
                ${
                  mode === "login"
                    ? "bg-gradient-twitter hover:bg-gradient-twitter-reverse"
                    : "bg-gradient-to-r from-twitter-purple-500 to-twitter-blue-500 hover:from-twitter-purple-600 hover:to-twitter-blue-600"
                }
                hover:scale-[1.02] hover:shadow-lg hover:shadow-twitter-blue-200/50 dark:hover:shadow-twitter-blue-500/25
                focus:outline-none focus:ring-2 focus:ring-twitter-blue-500 focus:ring-offset-2 dark:focus:ring-offset-twitter-dark-800
                disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none`}
            >
              <span className="relative z-10 inline-flex items-center justify-center gap-2">
                {mode === "login" ? <BookOpen size={20} /> : <User size={20} />}
                {loading
                  ? "Please wait…"
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-twitter-dark-500 dark:text-twitter-dark-400">
            By continuing, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Reusable InputField component
const InputField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  ...props
}) => (
  <div>
    <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
      {label}
    </label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="input-field"
      {...props}
    />
  </div>
);

export default LoginScreen;
