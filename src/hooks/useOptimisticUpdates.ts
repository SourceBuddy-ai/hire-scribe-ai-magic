import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  rollbackOnError?: boolean;
}

export function useOptimisticUpdates<T>(
  initialState: T,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [state, setState] = useState<T>(initialState);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const optimisticUpdate = useCallback(
    async (
      updateKey: string,
      optimisticData: T,
      actualUpdate: () => Promise<T>,
      rollbackData?: T
    ) => {
      // Add to pending updates
      setPendingUpdates(prev => new Set([...prev, updateKey]));
      
      // Apply optimistic update immediately
      setState(optimisticData);

      try {
        // Perform actual update
        const result = await actualUpdate();
        
        // Update with actual result
        setState(result);
        
        // Remove from pending updates
        setPendingUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(updateKey);
          return newSet;
        });

        // Call success callback
        options.onSuccess?.(result);

      } catch (error) {
        // Rollback on error if specified
        if (options.rollbackOnError !== false && rollbackData) {
          setState(rollbackData);
        }

        // Remove from pending updates
        setPendingUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(updateKey);
          return newSet;
        });

        // Show error toast
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });

        // Call error callback
        options.onError?.(error as Error);
      }
    },
    [options, toast]
  );

  const isPending = useCallback(
    (updateKey: string) => pendingUpdates.has(updateKey),
    [pendingUpdates]
  );

  const hasAnyPending = useCallback(
    () => pendingUpdates.size > 0,
    [pendingUpdates]
  );

  return {
    state,
    setState,
    optimisticUpdate,
    isPending,
    hasAnyPending,
    pendingUpdates: Array.from(pendingUpdates),
  };
} 