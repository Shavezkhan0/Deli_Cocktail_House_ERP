'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type CheckCircle2Props = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        scale: 1,
        opacity: 1,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        scale: [1, 1.08, 1],
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
        scale: [1, 1.08, 1],
        transition: { ease: 'easeInOut', duration: 0.8 },
      },
    },
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CheckCircle2Props) {
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
          d="M21.801 10A10 10 0 1 1 17 3.335"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="m9 11 3 3L22 4"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
      </motion.g>
    </motion.svg>
  );
}

function CheckCircle2(props: CheckCircle2Props) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  CheckCircle2,
  CheckCircle2 as CheckCircle2Icon,
  type CheckCircle2Props,
  type CheckCircle2Props as CheckCircle2IconProps,
};
