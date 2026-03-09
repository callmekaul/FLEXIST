"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Dumbbell,
  Home,
  Trophy,
  UtensilsCrossed,
  TrendingUp,
  UserCircle,
  Building2,
  Settings,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useGymStore } from "@/stores/gym-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const clientLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/diet", label: "Diet Plans", icon: UtensilsCrossed },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/gym", label: "My Gym", icon: Building2 },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

const ownerLinks = [
  { href: "/gym-admin", label: "Dashboard", icon: Home },
  { href: "/gym-admin/equipment", label: "Equipment", icon: Settings },
  { href: "/gym-admin/members", label: "Members", icon: UserCircle },
  { href: "/gym-admin/branding", label: "Branding", icon: Building2 },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

// Context so the header can render the mobile menu trigger
const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const { currentGym } = useGymStore();
  const { collapsed } = useSidebar();

  const { data: adminCheck } = useQuery({
    queryKey: ["admin-check"],
    queryFn: () => api.get("/api/gyms/admin/check").then((r) => r.data).catch(() => null),
    retry: false,
    staleTime: Infinity,
  });
  const isAdmin = adminCheck?.is_admin === true;

  const baseLinks = user?.role === "gym_owner" ? ownerLinks : clientLinks;
  const links = isAdmin
    ? [...baseLinks, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : baseLinks;

  return (
    <>
      <div className="mb-6 flex items-center gap-2 px-2">
        <Dumbbell className="h-8 w-8 shrink-0 text-primary" />
        {!collapsed && (
          <span className="text-xl font-bold truncate">
            {currentGym?.name || "Flexist"}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        <TooltipProvider delayDuration={0}>
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return collapsed ? (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-center rounded-lg p-2 transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{link.label}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </TooltipProvider>
      </nav>

      <Separator className="my-2" />

      <div className={cn("py-2", collapsed ? "px-0" : "px-2")}>
        {!collapsed && (
          <p className="mb-2 truncate text-sm text-muted-foreground">
            {user?.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2",
            collapsed ? "justify-center px-2" : "justify-start",
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col border-r bg-card p-4 transition-all duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarNav />
        <Button
          variant="ghost"
          size="icon"
          className="mt-1 self-center h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </aside>
    </SidebarContext.Provider>
  );
}

export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-4">
        <SidebarContext.Provider
          value={{ collapsed: false, setCollapsed: () => {} }}
        >
          <div className="flex h-full flex-col">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SidebarContext.Provider>
      </SheetContent>
    </Sheet>
  );
}
