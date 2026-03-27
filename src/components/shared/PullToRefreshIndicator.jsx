import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefreshIndicator({ pullDistance, threshold, isRefreshing }) {
  const progress = Math.min(pullDistance / threshold, 1);
  const isReady = progress >= 1;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center"
      style={{ height: pullDistance }}
      initial={{ opacity: 0 }}
      animate={{ opacity: pullDistance > 0 ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : progress * 180 }}
          transition={{ duration: isRefreshing ? 1 : 0.2, repeat: isRefreshing ? Infinity : 0 }}
        >
          <RefreshCw
            className="w-5 h-5 transition-colors"
            style={{
              color: isReady ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            }}
          />
        </motion.div>
        {!isRefreshing && (
          <motion.p
            className="text-xs font-semibold transition-colors"
            style={{
              color: isReady ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            }}
          >
            {isReady ? 'Release to refresh' : 'Pull to refresh'}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}