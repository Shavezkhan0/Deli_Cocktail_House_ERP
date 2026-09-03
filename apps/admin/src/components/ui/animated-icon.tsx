"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedIconProps extends React.ComponentProps<LucideIcon> {
  icon: LucideIcon;
  animationType?: "hover-scale" | "pulse" | "spin-hover" | "bounce";
  wrapperClassName?: string;
}

export function AnimatedIcon({
  icon: Icon,
  animationType = "hover-scale",
  wrapperClassName,
  className,
  ...props
}: AnimatedIconProps) {
  // Define animation variants based on the requested type
  const getVariants = () => {
    switch (animationType) {
      case "hover-scale":
        return {
          initial: { scale: 1, rotate: 0 },
          hover: { scale: 1.15, rotate: 5, transition: { type: "spring", stiffness: 400, damping: 10 } },
          tap: { scale: 0.9 },
        };
      case "pulse":
        return {
          initial: { scale: 1 },
          hover: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.5 } },
          tap: { scale: 0.95 },
        };
      case "spin-hover":
        return {
          initial: { rotate: 0 },
          hover: { rotate: 180, transition: { duration: 0.3 } },
          tap: { scale: 0.9 },
        };
      case "bounce":
        return {
          initial: { y: 0 },
          hover: { y: -4, transition: { yoyo: Infinity, duration: 0.4 } },
          tap: { scale: 0.9 },
        };
      default:
        return {
          initial: { scale: 1 },
          hover: { scale: 1.1 },
          tap: { scale: 0.95 },
        };
    }
  };

  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", wrapperClassName)}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      variants={getVariants()}
    >
      <Icon className={className} {...props} />
    </motion.div>
  );
}
