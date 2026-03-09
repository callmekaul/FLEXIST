"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Check, X, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { toast } from "sonner";

interface GymEntry {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  is_approved: boolean;
}

export default function AdminPage() {
  const queryClient = useQueryClient();

  const { data: adminCheck, isLoading: checkLoading } = useQuery({
    queryKey: ["admin-check"],
    queryFn: () => api.get("/api/gyms/admin/check").then((r) => r.data).catch(() => null),
    retry: false,
  });

  const { data: pendingGyms } = useQuery<GymEntry[]>({
    queryKey: ["admin-pending-gyms"],
    queryFn: () => api.get("/api/gyms/admin/pending").then((r) => r.data),
    enabled: adminCheck?.is_admin === true,
  });

  const { data: allGyms } = useQuery<GymEntry[]>({
    queryKey: ["admin-all-gyms"],
    queryFn: () => api.get("/api/gyms/admin/all").then((r) => r.data),
    enabled: adminCheck?.is_admin === true,
  });

  const approveMutation = useMutation({
    mutationFn: (gymId: string) => api.post(`/api/gyms/admin/${gymId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-gyms"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-gyms"] });
      toast.success("Gym approved!");
    },
    onError: () => toast.error("Failed to approve gym."),
  });

  const rejectMutation = useMutation({
    mutationFn: (gymId: string) => api.post(`/api/gyms/admin/${gymId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-gyms"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-gyms"] });
      toast.success("Gym rejected and removed.");
    },
    onError: () => toast.error("Failed to reject gym."),
  });

  const deleteMutation = useMutation({
    mutationFn: (gymId: string) => api.delete(`/api/gyms/admin/${gymId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-gyms"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-gyms"] });
      toast.success("Gym deleted.");
    },
    onError: () => toast.error("Failed to delete gym."),
  });

  if (checkLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  if (!adminCheck?.is_admin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">
          You do not have admin access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-8 w-8" /> Platform Admin
        </h1>
        <p className="text-muted-foreground">
          Manage gym approvals and platform settings.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval
            {(pendingGyms?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {pendingGyms?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Gyms</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {!pendingGyms?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No gyms pending approval.
              </CardContent>
            </Card>
          ) : (
            pendingGyms.map((gym) => (
              <Card key={gym.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">{gym.name}</CardTitle>
                        <CardDescription>
                          {gym.address}, {gym.city}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(gym.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => rejectMutation.mutate(gym.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {gym.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {gym.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {!allGyms?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No gyms registered yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {allGyms.map((gym) => (
                    <div
                      key={gym.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium text-sm">
                            {gym.name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {gym.city}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {gym.is_approved ? (
                          <>
                            <Badge variant="secondary">Approved</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Delete "${gym.name}"? This cannot be undone.`)) {
                                  deleteMutation.mutate(gym.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline">Pending</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate(gym.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectMutation.mutate(gym.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
