
import { Skeleton } from "../ui/skeleton";

export function VendorAuthSkeleton() {
  return (
    <div className="container mx-auto py-10">
      <Skeleton className="h-10 w-1/3 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-6" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}