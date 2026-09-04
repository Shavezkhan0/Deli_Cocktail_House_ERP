"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { motion, type Transition, type Variants } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const MOTION_EVENT_PROPS = [
  "onDrag",
  "onDragStart",
  "onDragEnd",
  "onDragTransitionEnd",
  "onPan",
  "onPanStart",
  "onPanEnd",
  "onPanSessionStart",
  "onPanSessionEnd",
  "onTap",
  "onTapStart",
  "onTapCancel",
  "onHoverStart",
  "onHoverEnd",
  "onAnimationStart",
  "onAnimationComplete",
  "onAnimationCancel",
  "onUpdate",
  "onViewportEnter",
  "onViewportLeave",
] as const

function stripMotionEventProps<P extends object>(
  props: P
): Omit<P, (typeof MOTION_EVENT_PROPS)[number]> {
  const next = props as Record<string, unknown>
  for (const key of MOTION_EVENT_PROPS) {
    delete next[key]
  }
  return next as Omit<P, (typeof MOTION_EVENT_PROPS)[number]>
}

const dialogTransition: Transition = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1],
}

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const contentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, x: "-50%", y: "-50%" },
  visible: { opacity: 1, scale: 1, x: "-50%", y: "-50%" },
}

function AnimatedDialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function AnimatedDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        render={(backdropProps, state) => {
          const hidden =
            state.transitionStatus === "starting" ||
            state.transitionStatus === "ending"
          return (
            <motion.div
              {...stripMotionEventProps(backdropProps)}
              data-slot="dialog-overlay"
              className="fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
              variants={overlayVariants}
              initial="hidden"
              animate={hidden ? "hidden" : "visible"}
              transition={dialogTransition}
            />
          )
        }}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        render={(popupProps, state) => {
          const hidden =
            state.transitionStatus === "starting" ||
            state.transitionStatus === "ending"
          return (
            <motion.div
              {...stripMotionEventProps(popupProps)}
              data-slot="dialog-content"
              className={cn(
                "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm",
                className
              )}
              variants={contentVariants}
              initial="hidden"
              animate={hidden ? "hidden" : "visible"}
              transition={dialogTransition}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close
                  data-slot="dialog-close"
                  render={
                    <Button
                      variant="ghost"
                      className="absolute top-2 right-2"
                      size="icon-sm"
                    />
                  }
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </motion.div>
          )
        }}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

export {
  AnimatedDialog,
  AnimatedDialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
