'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type CheckProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        scale: 1,
        opacity: 1,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        scale: [1, 1.15, 1],
        transition: { ease: 'easeInOut', duration: 0.4 },
      },
    },
    path1: {},
  } satisfies Record<string, Variants>,
  'default-loop': {
    group: {
      initial: {
        scale: 1,
      },
      animate: {
        scale: [1, 1.15, 1],
        transition: { ease: 'easeInOut', duration: 0.7 },
      },
    },
    path1: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CheckProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.g variants={variants.group} initial="initial" animate={controls}>
        <motion.path
          d="M20 6 9 17l-5-5"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function Check(props: CheckProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Check,
  Check as CheckIcon,
  type CheckProps,
  type CheckProps as CheckIconProps,
};
