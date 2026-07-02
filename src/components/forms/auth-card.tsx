import Link from "next/link";
import { Scissors } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  error,
  message,
  children,
}: {
  title: string;
  description: string;
  error?: string;
  message?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-stone-100"
        >
          <span className="grid size-9 place-items-center rounded-full bg-amber-500 text-stone-950">
            <Scissors className="size-4" />
          </span>
          <span className="font-semibold">NexoBarber</span>
        </Link>
        <Card className="border-white/10 bg-stone-900 text-stone-100">
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-stone-400">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
            {children}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
