'use client';

import { Card } from '@/components/ui/card';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PredictionCardProps {
  type: '1' | 'X' | '2';
  percentage: number;
  matchCount?: number;
  confidence?: 'high' | 'medium' | 'low';
}

export function PredictionCard({ 
  type, 
  percentage, 
  matchCount = 10,
  confidence = 'medium' 
}: PredictionCardProps) {
  // Motion value to control the filling effect
  const fillHeight = useMotionValue(0);
  const y = useTransform(fillHeight, [0, 100], ['100%', '0%']);

  // Animate the filling effect based on the percentage
  useEffect(() => {
    const controls = animate(fillHeight, percentage, {
      duration: 1.5,
      ease: [0.32, 0.72, 0, 1],
    });
    return controls.stop;
  }, [fillHeight, percentage]);

  // Determine the fill color based on percentage and confidence
  const getColor = (percent: number, conf: string) => {
    const opacity = conf === 'high' ? '70' : conf === 'medium' ? '50' : '30';
    return `bg-emerald-400/${opacity}`;
  };

  // Display the confidence text
  const getConfidenceText = (conf: string) => {
    switch (conf) {
      case 'high': return 'Alta confidenza';
      case 'medium': return 'Media confidenza';
      case 'low': return 'Bassa confidenza';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            className="relative"
          >
            <Card className="relative p-6 text-center cursor-pointer overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-200">
              {/* Card Content */}
              <div className="relative z-10">
                <div className="text-4xl font-bold mb-4 bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                  {type}
                </div>
                <div className="text-3xl font-bold mb-1">
                  {percentage}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Basato su {matchCount} partite
                </div>
              </div>

              {/* Dynamic Fill */}
              <motion.div 
                className={`absolute bottom-0 left-0 w-full ${getColor(percentage, confidence)}`}
                style={{ height: '100%', transformOrigin: 'bottom', y }}
              >
                <div className="h-full w-full bg-gradient-to-t from-emerald-500/50 to-transparent" />
              </motion.div>
            </Card>
          </motion.div>
        </TooltipTrigger>

        {/* Tooltip */}
        <TooltipContent side="top" className="p-4 max-w-[200px]">
          <p className="text-sm font-medium mb-2">
            Probabilità: {percentage}%
          </p>
          <p className="text-xs text-muted-foreground">
            {getConfidenceText(confidence)}
            <br />
            Analisi basata su {matchCount} partite precedenti
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
