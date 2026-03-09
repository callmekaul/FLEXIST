"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, UserMinus } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { useGymStore } from "@/stores/gym-store";
import { toast } from "sonner";
import type { GymMemberWithUser } from "@/types";

export default function MembersPage() {
  const queryClient = useQueryClient();
  const { currentGym } = useGymStore();

  const { data: pendingMembers, isLoading: pendingLoading } = useQuery<GymMemberWithUser[]>({
    queryKey: ["gym-members", currentGym?.id, "pending"],
    queryFn: () =>
      api
        .get(`/api/gyms/${currentGym?.id}/members`, {
          params: { status: "pending" },
        })
        .then((r) => r.data),
    enabled: !!currentGym,
  });

  const { data: approvedMembers, isLoading: approvedLoading } = useQuery<GymMemberWithUser[]>({
    queryKey: ["gym-members", currentGym?.id, "approved"],
    queryFn: () =>
      api
        .get(`/api/gyms/${currentGym?.id}/members`, {
          params: { status: "approved" },
        })
        .then((r) => r.data),
    enabled: !!currentGym,
  });

  const approveMutation = useMutation({
    mutationFn: (membershipId: string) =>
      api.post(`/api/memberships/${membershipId}/approve`),
    onSuccess: () => {
      toast.success("Member approved!");
      queryClient.invalidateQueries({ queryKey: ["gym-members"] });
    },
    onError: () => toast.error("Failed to approve member."),
  });

  const rejectMutation = useMutation({
    mutationFn: (membershipId: string) =>
      api.post(`/api/memberships/${membershipId}/reject`),
    onSuccess: () => {
      toast.success("Request rejected.");
      queryClient.invalidateQueries({ queryKey: ["gym-members"] });
    },
    onError: () => toast.error("Failed to reject request."),
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) =>
      api.post(`/api/memberships/${membershipId}/remove`),
    onSuccess: () => {
      toast.success("Member removed.");
      queryClient.invalidateQueries({ queryKey: ["gym-members"] });
    },
    onError: () => toast.error("Failed to remove member."),
  });

  if (!currentGym) {
    return <p className="text-muted-foreground">No gym found. Register your gym first.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          Manage member requests and view active members at {currentGym.name}.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests
            {(pendingMembers?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingMembers?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Active Members ({approvedMembers?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingLoading && (
            <p className="text-muted-foreground">Loading...</p>
          )}
          {!pendingLoading && pendingMembers?.length === 0 && (
            <p className="text-muted-foreground">No pending requests.</p>
          )}
          {pendingMembers?.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{m.user_full_name}</p>
                  <p className="text-sm text-muted-foreground">{m.user_email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(m.id)}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(m.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-3 mt-4">
          {approvedLoading && (
            <p className="text-muted-foreground">Loading...</p>
          )}
          {!approvedLoading && approvedMembers?.length === 0 && (
            <p className="text-muted-foreground">
              No members yet. Share your gym with potential clients!
            </p>
          )}
          {approvedMembers?.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{m.user_full_name}</p>
                  <p className="text-sm text-muted-foreground">{m.user_email}</p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Remove ${m.user_full_name}?`)) removeMutation.mutate(m.id);
                  }}
                  disabled={removeMutation.isPending}
                >
                  <UserMinus className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
