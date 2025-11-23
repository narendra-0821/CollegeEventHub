import type React from "react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
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
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

type Step = "email" | "code" | "password" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [formData, setFormData] = useState({
    email: "",
    resetCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "loading" | "success" | "invalid"
  >("idle");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  // Step 1: Send reset code
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      if (response.ok) {
        setStep("code");
        toast({ description: "Reset code sent to your email" });
      } else {
        setError(data.error || "Failed to send reset code");
        toast({
          variant: "destructive",
          description: data.error || "Failed to send reset code",
        });
      }
    } catch {
      setError("An error occurred while sending reset code");
      toast({
        variant: "destructive",
        description: "An error occurred while sending reset code",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code via server
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCodeStatus("idle");
    if (formData.resetCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      setCodeStatus("invalid");
      return;
    }
    setIsLoading(true);
    setCodeStatus("loading");
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/auth/verify-reset-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            code: formData.resetCode,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Invalid or expired code");
        setCodeStatus("invalid");
        toast({
          variant: "destructive",
          description: data.error || "Invalid or expired code",
        });
        return;
      }
      setCodeStatus("success");
      toast({ description: "Code verified" });
      // brief success feedback before moving on
      setTimeout(() => {
        setStep("password");
        setCodeStatus("idle");
      }, 1000);
    } catch (err) {
      setError("Unable to verify code. Please try again.");
      setCodeStatus("invalid");
      toast({
        variant: "destructive",
        description: "Unable to verify code. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Password strength validation
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,15}$/;
    if (!passwordRegex.test(formData.newPassword)) {
      setError("Password must be less than 16 characters with letters, numbers, and special characters");
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: formData.resetCode,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setStep("success");
        toast({ description: "Password reset successful" });
      } else {
        setError(data.error || "Failed to reset password");
        toast({
          variant: "destructive",
          description: data.error || "Failed to reset password",
        });
      }
    } catch {
      setError("An error occurred while resetting password");
      toast({
        variant: "destructive",
        description: "An error occurred while resetting password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render steps ---
  const renderEmailStep = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-[#6D29C0] hover:bg-[#5A1F9A] text-white"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending code...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Reset Code
          </>
        )}
      </Button>
      <div className="text-center">
        <Link to="/login" className="text-sm text-[#6D29C0] hover:underline">
          Back to Login
        </Link>
      </div>
    </form>
  );

  const renderCodeStep = () => (
    <form onSubmit={handleCodeSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="resetCode">Verification Code</Label>
        <Input
          id="resetCode"
          name="resetCode"
          type="text"
          placeholder="Enter 6-digit code"
          value={formData.resetCode}
          onChange={handleChange}
          onFocus={() => setCodeStatus("idle")}
          maxLength={6}
          className="text-center text-lg tracking-widest"
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-[#6D29C0] hover:bg-[#5A1F9A] text-white"
        disabled={codeStatus === "loading"}
      >
        {codeStatus === "loading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : codeStatus === "success" ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4 text-white" />
            Verified
          </>
        ) : codeStatus === "invalid" ? (
          <span className="text-red-200">Invalid code</span>
        ) : (
          "Verify"
        )}
      </Button>
      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={() => setStep("email")}
          className="text-sm text-[#6D29C0] hover:underline"
        >
          Use different email
        </button>
      </div>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={formData.newPassword}
            onChange={handleChange}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            required
            disabled={isLoading}
            minLength={6}
            maxLength={15}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {passwordFocused && (
          <p
            className={`mt-1 text-sm ${
              /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{15}$/.test(
                formData.newPassword
              )
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{15}$/.test(
              formData.newPassword
            )
              ? "Strong password"
              : "Use mix of text-number-character (>6 and <16 chars)"}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {confirmFocused && formData.confirmPassword.length > 0 && (
          <p
            className={`mt-1 text-sm ${
              formData.confirmPassword &&
              formData.confirmPassword === formData.newPassword
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formData.confirmPassword &&
            formData.confirmPassword === formData.newPassword
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
            Resetting password...
          </>
        ) : (
          "Reset Password"
        )}
      </Button>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="space-y-4 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <Button
        onClick={() => navigate("/login")}
        className="w-full bg-[#6D29C0] hover:bg-[#5A1F9A] text-white"
      >
        Go to Login
      </Button>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case "email":
        return "Forgot Password";
      case "code":
        return "Enter Verification Code";
      case "password":
        return "Create New Password";
      case "success":
        return "Password Reset Complete";
      default:
        return "Forgot Password";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "email":
        return "Enter your email address and we'll send you a verification code";
      case "code":
        return "Check your email for the 6-digit verification code";
      case "password":
        return "Enter your new password";
      case "success":
        return "Your password has been successfully reset";
      default:
        return "";
    }
  };

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
        <CardHeader className="text-center relative">
          {step !== "email" && step !== "success" && (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => setStep("email")}
              className="absolute left-2 top-2 p-2 rounded hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {step === "email" ? (
            <img
              src="/sad.png"
              alt="Sad"
              className="h-16 w-auto mx-auto mb-2"
            />
          ) : (
            <img
              src="/relaxed.png"
              alt="Relaxed"
              className="h-16 w-auto mx-auto mb-2"
            />
          )}
          <CardTitle className="text-2xl font-bold">{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && renderEmailStep()}
          {step === "code" && renderCodeStep()}
          {step === "password" && renderPasswordStep()}
          {step === "success" && renderSuccessStep()}
        </CardContent>
      </Card>
    </div>
  );
}
