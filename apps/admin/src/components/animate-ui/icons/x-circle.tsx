'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type XCircleProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        scale: 1,
        rotate: 0,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        scale: [1, 1.1, 1],
        rotate: [0, -8, 0],
        transition: { ease: 'easeInOut', duration: 0.45 },
      },
    },
    path1: {},
    path2: {},
    path3: {},
  } satisfies Record<string, Variants>,
  'default-loop': {
    group: {
      initial: {
        scale: 1,
      },
      animate: {
        scale: [1, 1.1, 1],
        transition: { ease: 'easeInOut', duration: 0.8 },
      },
    },
    path1: {},
    path2: {},
    path3: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: XCircleProps) {
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
          d="M15 9l-6 6"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="m9 9 6 6"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M21 12a9 9 0 1 1-9-9"
          variants={variants.path3}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function XCircle(props: XCircleProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  XCircle,
  XCircle as XCircleIcon,
  type XCircleProps,
  type XCircleProps as XCircleIconProps,
};
