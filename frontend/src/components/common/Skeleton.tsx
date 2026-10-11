import { cn } from '../../lib/cn';

export default function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-control bg-line', className)} aria-hidden="true" />;
}
