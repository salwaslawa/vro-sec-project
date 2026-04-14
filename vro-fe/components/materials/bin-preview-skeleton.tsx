
export function BinPreviewSkeleton() {
  return (
    <div className="w-full min-w-[150px] animate-pulse">
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="h-3 w-1/2 bg-gray-200 rounded"></span>
        <span className="h-3 w-1/4 bg-gray-200 rounded"></span>
      </div>
      <div className="flex space-x-1 h-3">
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
      </div>
    </div>
  );
}