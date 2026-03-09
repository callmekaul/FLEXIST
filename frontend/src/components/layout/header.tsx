"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useGymStore } from "@/stores/gym-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";

export function Header() {
  const { user } = useAuthStore();
  const { currentGym } = useGymStore();

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebarTrigger />
        {currentGym && (
          <Badge variant="secondary">{currentGym.name}</Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user?.full_name}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
