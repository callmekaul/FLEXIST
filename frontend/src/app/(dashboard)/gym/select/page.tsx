"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Gym } from "@/types";

export default function GymSelectPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: gyms } = useQuery<Gym[]>({
    queryKey: ["gyms", search],
    queryFn: () =>
      api
        .get("/api/gyms", { params: search ? { search } : {} })
        .then((r) => r.data),
  });

  const { data: myStatus } = useQuery({
    queryKey: ["my-membership-status"],
    queryFn: () =>
      api.get("/api/memberships/my-status").then((r) => r.data),
  });

  const joinMutation = useMutation({
    mutationFn: (gymId: string) =>
      api.post("/api/memberships/join", null, { params: { gym_id: gymId } }),
    onSuccess: () => {
      toast.success("Join request sent! Waiting for gym owner approval.");
      queryClient.invalidateQueries({ queryKey: ["my-membership-status"] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || "Failed to send request.";
      toast.error(detail);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Select Your Gym</h1>
        <p className="text-muted-foreground">
          Request to join a gym. The owner will review and approve your request.
        </p>
      </div>

      {myStatus?.status === "pending" && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <Clock className="h-5 w-5 text-yellow-500" />
          <p className="text-sm">
            Your join request is pending approval. The gym owner will review it shortly.
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search gyms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {gyms?.length === 0 && (
        <p className="text-muted-foreground">No gyms found.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gyms?.map((gym) => {
          const isPending = myStatus?.status === "pending" && myStatus?.gym_id === gym.id;
          const isApproved = myStatus?.status === "approved" && myStatus?.gym_id === gym.id;

          return (
            <Card key={gym.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{gym.name}</CardTitle>
                  {isPending && <Badge variant="outline">Pending</Badge>}
                  {isApproved && <Badge>Member</Badge>}
                </div>
                <CardDescription>
                  {gym.address}, {gym.city}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gym.description && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {gym.description}
                  </p>
                )}
                <Button
                  onClick={() => joinMutation.mutate(gym.id)}
                  className="w-full"
                  disabled={isPending || isApproved || joinMutation.isPending}
                >
                  {isPending
                    ? "Request Pending"
                    : isApproved
                      ? "Already a Member"
                      : "Request to Join"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
