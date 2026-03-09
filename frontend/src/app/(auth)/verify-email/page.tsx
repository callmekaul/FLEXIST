"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);

  // Try to get the email from Supabase session (user just signed up)
  const [email, setEmail] = useState<string | null>(null);

  // On mount, check if there's a user that just signed up
  if (email === null) {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }

  const handleResend = async () => {
    if (!email) {
      toast.error("No email found. Please register again.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast.success("Verification email resent!");
    } catch {
      toast.error("Failed to resend email. Try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We&apos;ve sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "your email"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Click the link in the email to verify your account. If you
          don&apos;t see it, check your spam folder.
        </p>
        <Button
          variant="outline"
          onClick={handleResend}
          disabled={resending}
          className="w-full"
        >
          {resending ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Resend verification email
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/login" className="text-primary underline">
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
