'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type PackagePlusProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        scale: 1,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        scale: [1, 1.1, 1],
        transition: { ease: 'easeInOut', duration: 0.4 },
      },
    },
    plus1: {
      initial: {
        opacity: 0,
        x: 2,
        y: 2,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        opacity: [0, 1, 1, 0],
        x: [2, 0, 0, -2],
        y: [2, 0, 0, -2],
        transition: { ease: 'easeInOut', duration: 0.45 },
      },
    },
    plus2: {
      initial: {
        opacity: 0,
        x: 2,
        y: -2,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        opacity: [0, 1, 1, 0],
        x: [2, 0, 0, -2],
        y: [-2, 0, 0, 2],
        transition: { ease: 'easeInOut', duration: 0.45 },
      },
    },
    path1: {},
    path2: {},
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
    plus1: {},
    plus2: {},
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: PackagePlusProps) {
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
          d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M3.29 7 12 12l8.71-5"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
        <motion.g variants={variants.plus1} initial="initial" animate={controls}>
          <motion.path d="M16 16h6" />
          <motion.path d="M19 13v6" />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}

function PackagePlus(props: PackagePlusProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  PackagePlus,
  PackagePlus as PackagePlusIcon,
  type PackagePlusProps,
  type PackagePlusProps as PackagePlusIconProps,
};
