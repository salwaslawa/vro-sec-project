import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-700/40", className)} />
  );
}

export function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-6">

        <div className="flex flex-col gap-2 mt-2">
          <SkeletonBox className="h-7 w-48" /> 
          <SkeletonBox className="h-4 w-60" /> 
        </div>

        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <SkeletonBox className="h-4 w-20" />   
            <SkeletonBox className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBox className="h-4 w-20" />   
            <SkeletonBox className="h-10 w-full" />
          </div>
        </div>

        <SkeletonBox className="h-10 w-full mt-4" />
      </div>
    </div>
  );
}
