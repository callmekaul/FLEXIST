"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGymStore } from "@/stores/gym-store";
import { useThemeStore } from "@/stores/theme-store";
import api from "@/lib/api";
import { toast } from "sonner";
import type { GymEquipment } from "@/types";

export default function GymPage() {
  const queryClient = useQueryClient();
  const { currentGym, setCurrentGym } = useGymStore();

  const leaveMutation = useMutation({
    mutationFn: () => api.delete("/api/memberships/leave"),
    onSuccess: () => {
      setCurrentGym(null);
      useThemeStore.getState().clearTheme();
      queryClient.invalidateQueries({ queryKey: ["my-membership-status"] });
      toast.success("You have left the gym.");
    },
    onError: () => toast.error("Failed to leave gym."),
  });

  const { data: equipment, isLoading: equipLoading } = useQuery<GymEquipment[]>({
    queryKey: ["gym-equipment", currentGym?.id],
    queryFn: () =>
      api.get(`/api/gyms/${currentGym?.id}/equipment`).then((r) => r.data),
    enabled: !!currentGym,
  });

  if (!currentGym) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Gym</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Gym Selected</CardTitle>
            <CardDescription>
              Select a gym to see its details and get equipment-tailored
              workouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/gym/select">
              <Button>Select a Gym</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentGym.name}</h1>
          <p className="text-muted-foreground">
            {currentGym.address}, {currentGym.city}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/gym/select">
            <Button variant="outline">Change Gym</Button>
          </Link>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Leave this gym?")) leaveMutation.mutate();
            }}
            disabled={leaveMutation.isPending}
          >
            Leave Gym
          </Button>
        </div>
      </div>

      {currentGym.description && (
        <Card>
          <CardContent className="py-4">
            <p>{currentGym.description}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-xl font-semibold">Available Equipment</h2>
        {equipLoading && (
          <p className="text-muted-foreground">Loading equipment...</p>
        )}
        {!equipLoading && equipment?.length === 0 && (
          <p className="text-muted-foreground">
            No equipment listed for this gym yet.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {equipment?.map((eq) => (
            <Badge key={eq.id} variant="secondary" className="px-3 py-1">
              {eq.equipment_name}
              {eq.quantity > 1 && ` (x${eq.quantity})`}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
