'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type Building2Props = IconProps<keyof typeof animations>;

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
    path5: {},
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
    path5: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: Building2Props) {
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
          d="M10 12h4"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M10 8h4"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M14 21v-3a2 2 0 0 0-4 0v3"
          variants={variants.path3}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
          variants={variants.path4}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"
          variants={variants.path5}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function Building2(props: Building2Props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Building2,
  Building2 as Building2Icon,
  type Building2Props,
  type Building2Props as Building2IconProps,
};
