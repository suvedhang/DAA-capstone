import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Compass className="h-8 w-8 text-ink-faint" />
      <p className="text-lg font-semibold text-ink">This view does not exist</p>
      <p className="max-w-sm text-xs text-ink-muted">
        The requested route is not part of AquaMind. Use the navigation to return to an implemented module.
      </p>
      <Button asChild variant="secondary" size="sm">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  );
}
