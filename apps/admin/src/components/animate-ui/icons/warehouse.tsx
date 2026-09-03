'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type WarehouseProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        y: 0,
        transition: { duration: 0.3, ease: 'easeInOut' },
      },
      animate: {
        y: [0, -2, 0],
        transition: { duration: 0.45, ease: 'easeInOut' },
      },
    },
    path1: {},
    path2: {},
    path3: {},
    path4: {},
  } satisfies Record<string, Variants>,
  'default-loop': {
    group: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, -2, 0],
        transition: { duration: 0.6, ease: 'easeInOut' },
      },
    },
    path1: {},
    path2: {},
    path3: {},
    path4: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: WarehouseProps) {
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
          d="M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 1.132-1.803l7.95-3.974a2 2 0 0 1 1.837 0l7.948 3.974A2 2 0 0 1 22 8z"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M6 13h12"
          variants={variants.path3}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M6 17h12"
          variants={variants.path4}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function Warehouse(props: WarehouseProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Warehouse,
  Warehouse as WarehouseIcon,
  type WarehouseProps,
  type WarehouseProps as WarehouseIconProps,
};
