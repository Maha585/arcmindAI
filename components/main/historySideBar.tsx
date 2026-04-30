import { Skeleton } from "../ui/skeleton";

const SkeletonHistoryItem = () => {
  return (
    <div className="animate-pulse flex items-center gap-2 px-3 py-2">
      <Skeleton className="h-3 w-3 rounded-full"></Skeleton>
      <Skeleton className="h-3 flex-1 rounded"></Skeleton>
    </div>
  );
};
export const HistorySideBarSkeleton = () => {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <SkeletonHistoryItem key={index} />
      ))}
    </>
  );
};
