import { Dumbbell } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="flex items-center justify-center gap-2">
          <Dumbbell className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Flexist</span>
        </div>
        {children}
      </div>
    </div>
  );
}
