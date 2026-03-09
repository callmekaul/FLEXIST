"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import type { Gym, GymEquipment } from "@/types";

interface MasterEquipment {
  id: string;
  name: string;
  category: string;
}

export default function EquipmentPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: gyms } = useQuery<Gym[]>({
    queryKey: ["my-gyms"],
    queryFn: () => api.get("/api/gyms").then((r) => r.data),
  });
  const myGym = gyms?.find((g) => g.owner_id === user?.id);

  const { data: equipment, isLoading: equipLoading } = useQuery<GymEquipment[]>({
    queryKey: ["gym-equipment", myGym?.id],
    queryFn: () =>
      api.get(`/api/gyms/${myGym?.id}/equipment`).then((r) => r.data),
    enabled: !!myGym,
  });

  const { data: catalog } = useQuery<MasterEquipment[]>({
    queryKey: ["equipment-catalog", search],
    queryFn: () =>
      api.get("/api/equipment", { params: { search, limit: 50 } }).then((r) => r.data),
    enabled: showAdd,
  });

  // Filter out equipment already added to the gym
  const existingIds = new Set(equipment?.map((e) => e.equipment_id) ?? []);
  const availableCatalog = catalog?.filter((e) => !existingIds.has(e.id)) ?? [];

  const addMutation = useMutation({
    mutationFn: (equipmentId: string) =>
      api.post(`/api/gyms/${myGym?.id}/equipment`, {
        equipment_id: equipmentId,
        quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-equipment"] });
      toast.success("Equipment added.");
      setQuantity(1);
    },
    onError: () => toast.error("Failed to add equipment."),
  });

  const removeMutation = useMutation({
    mutationFn: (entryId: string) =>
      api.delete(`/api/gyms/${myGym?.id}/equipment/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-equipment"] });
      toast.success("Equipment removed.");
    },
    onError: () => toast.error("Failed to remove equipment."),
  });

  if (!myGym) {
    return <p className="text-muted-foreground">No gym found.</p>;
  }

  // Group equipment by category
  const grouped = equipment?.reduce(
    (acc, eq) => {
      const cat = eq.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(eq);
      return acc;
    },
    {} as Record<string, GymEquipment[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipment</h1>
          <p className="text-muted-foreground">
            Manage the equipment available at {myGym.name}.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      {/* Add equipment panel */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add from Equipment Catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quantity:</span>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-20 h-8"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {availableCatalog.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  {search ? "No matching equipment found." : "All equipment already added."}
                </p>
              )}
              {availableCatalog.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => addMutation.mutate(eq.id)}
                  disabled={addMutation.isPending}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{eq.name}</span>
                  <Badge variant="outline" className="capitalize">
                    {eq.category.replace("_", " ")}
                  </Badge>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAdd(false);
                setSearch("");
              }}
              className="w-full"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current equipment */}
      {equipLoading && (
        <p className="text-muted-foreground">Loading equipment...</p>
      )}
      {!equipLoading && equipment?.length === 0 && !showAdd && (
        <p className="text-muted-foreground">
          No equipment added yet. Click &quot;Add Equipment&quot; to get started.
        </p>
      )}

      {grouped &&
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                {category.replace("_", " ")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((eq) => (
                  <Card key={eq.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{eq.equipment_name}</p>
                        <span className="text-sm text-muted-foreground">
                          Qty: {eq.quantity}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Remove ${eq.equipment_name}?`)) removeMutation.mutate(eq.id);
                        }}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
    </div>
  );
}
