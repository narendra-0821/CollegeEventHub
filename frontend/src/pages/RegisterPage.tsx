import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  User,
  Mail,
  GraduationCap,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    college: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setCountdown(4);
        toast({
          description:
            "Registration successful. Check your email for verification.",
        });
      } else {
        setError(data?.error || "Registration failed");
        toast({
          variant: "destructive",
          description: data?.error || "Registration failed",
        });
      }
    } catch (err) {
      setError("An error occurred during registration");
      toast({
        variant: "destructive",
        description: "An error occurred during registration",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            navigate("/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [success, navigate]);

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: "url('/background.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <header className="absolute top-4 left-4 z-20">
          <img src="/logo.png" alt="Campus EventHub" className="h-24 w-auto" />
        </header>
        <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">
              Registration Successful!
            </CardTitle>
            <CardDescription className="text-[#29ad00]">
              Please check your email and click the verification link to
              activate your account. The link opens a verification page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-[#6D29C0] hover:bg-[#5A1F9A] text-white"
            >
              Back to Login{countdown > 0 ? ` (${countdown} sec)` : ""}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/background.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <header className="absolute top-4 left-4 z-20">
        <img src="/logo.png" alt="Campus EventHub" className="h-24 w-auto" />
      </header>
      <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-0.5">
          <User
            className="h-12 w-12 mx-auto -mt-2 mb-1 text-[#6D29C0]"
            aria-hidden="true"
          />
          <CardTitle className="text-xl font-bold">Create Account</CardTitle>
          <CardDescription>Join College Event Hub today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pr-9"
                />
                <Mail
                  className="h-4 w-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="college">College Name</Label>
              <div className="relative">
                <Input
                  id="college"
                  name="college"
                  type="text"
                  placeholder="Enter your college name"
                  value={formData.college}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pr-9"
                />
                <GraduationCap
                  className="h-4 w-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                onValueChange={handleRoleChange}
                value={formData.role}
                name="role"
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  disabled={isLoading}
                  minLength={6}
                  maxLength={15}
                  className="pr-9"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-transparent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordFocused && (
                <p
                  className={`mt-1 text-sm ${
                    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{15}$/.test(
                      formData.password
                    )
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{15}$/.test(
                    formData.password
                  )
                    ? "Strong password"
                    : "Use mix of text-number-character-symbols (>6 and <16 chars)"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  required
                  disabled={isLoading}
                  minLength={6}
                  maxLength={15}
                  className="pr-9"
                />
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-transparent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmFocused && formData.confirmPassword.length > 0 && (
                <p
                  className={`mt-1 text-sm ${
                    formData.confirmPassword &&
                    formData.confirmPassword === formData.password
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formData.confirmPassword &&
                  formData.confirmPassword === formData.password
                    ? "Password match"
                    : "Password don't match"}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-[#6D29C0] hover:bg-[#5A1F9A] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-[#6D29C0] hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
