'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type Trash2Props = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        x: 0,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        x: [0, -2, 2, -2, 2, 0],
        transition: { ease: 'easeInOut', duration: 0.5 },
      },
    },
    lid: {
      initial: {
        transformOrigin: 'center',
        rotate: 0,
        y: 0,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        rotate: [0, -12, 0],
        y: [0, -1, 0],
        transition: { ease: 'easeInOut', duration: 0.5 },
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
        x: 0,
      },
      animate: {
        x: [0, -2, 2, -2, 2, 0],
        transition: { ease: 'easeInOut', duration: 0.8 },
      },
    },
    lid: {
      initial: {
        transformOrigin: 'center',
        rotate: 0,
      },
      animate: {
        rotate: [0, -12, 0],
        transition: { ease: 'easeInOut', duration: 0.8 },
      },
    },
    path1: {},
    path2: {},
    path3: {},
    path4: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: Trash2Props) {
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
      <motion.path
        d="M3 6h18"
        variants={variants.lid}
        initial="initial"
        animate={controls}
      />
      <motion.g variants={variants.group} initial="initial" animate={controls}>
        <motion.path
          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M10 11v6"
          variants={variants.path3}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M14 11v6"
          variants={variants.path4}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function Trash2(props: Trash2Props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Trash2,
  Trash2 as Trash2Icon,
  type Trash2Props,
  type Trash2Props as Trash2IconProps,
};
