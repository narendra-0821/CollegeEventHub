import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileCheck, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }
    const verify = async () => {
      setStatus("loading");
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          if (data?.message === "Already verified") {
            setMessage("Account already activated..!");
          } else {
            setMessage(data?.message || "Email verified successfully");
          }
          toast({ description: data?.message === "Already verified" ? "Account already activated" : "Email verified successfully" });
        } else {
          setStatus("error");
          setMessage(data?.error || "Verification failed");
          toast({
            variant: "destructive",
            description: data?.error || "Verification failed",
          });
        }
      } catch (e) {
        setStatus("error");
        setMessage("Unable to verify at the moment");
        toast({
          variant: "destructive",
          description: "Unable to verify at the moment",
        });
      }
    };
    verify();
  }, [searchParams, navigate]);

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
          {status === "success" ? (
            <FileCheck className="h-16 w-16 text-green-500 mx-auto mb-2" />
          ) : status === "error" ? (
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
          ) : (
            <Loader2 className="h-16 w-16 text-[#6D29C0] mx-auto mb-2 animate-spin" />
          )}
          <CardTitle className="text-2xl font-bold">
            {message === "Account already activated..!" ? "Account already activated" : "Account activated"}
          </CardTitle>
          <CardDescription className="text-black">
            {status === "loading" ? "Verifying your email..." : message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <>
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="mt-4 flex gap-2">
                <Link to="/login" className="w-full">
                  <Button className="w-full bg-[#6D29C0] hover:bg-[#5A1F9A] text-white">
                    Go to Login
                  </Button>
                </Link>
                <Link to="/register" className="w-full">
                  <Button variant="outline" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            </>
          )}
          {status === "success" && (
            <div className="text-center text-black">
              {message === "Account already activated..!" ? (
                <p>Please login through website...</p>
              ) : (
                <p>You can now safely close this tab and go back to the website.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
