"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Users, Settings, Palette, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import api from "@/lib/api";
import type { Gym } from "@/types";

export default function GymAdminDashboard() {
  const { data: myGym, isLoading } = useQuery<Gym | null>({
    queryKey: ["my-gym"],
    queryFn: () => api.get("/api/gyms/mine").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!myGym) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gym Admin</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Gym Registered</CardTitle>
            <CardDescription>
              Register your gym to start managing it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/gym-admin/register">
              <Button>Register Your Gym</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (myGym && !myGym.is_approved) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gym Admin</h1>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-yellow-500" />
              <div>
                <CardTitle>{myGym.name}</CardTitle>
                <CardDescription>
                  {myGym.address}, {myGym.city}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="mb-2">Pending Approval</Badge>
            <p className="text-sm text-muted-foreground">
              Your gym registration has been submitted and is awaiting approval from the platform admin.
              You&apos;ll be able to manage your gym once it&apos;s approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{myGym.name}</h1>
        <p className="text-muted-foreground">
          {myGym.address}, {myGym.city}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/gym-admin/equipment">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <Settings className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Equipment</CardTitle>
              <CardDescription>
                Manage machines and equipment available at your gym.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/gym-admin/members">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Members</CardTitle>
              <CardDescription>
                View and manage your gym members.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/gym-admin/branding">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <Palette className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize your gym&apos;s colors and logo.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
