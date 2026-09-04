'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type FileTextProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: {
        y: 0,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        y: [0, -2, 0],
        transition: { ease: 'easeInOut', duration: 0.45 },
      },
    },
    lines: {
      initial: {
        opacity: 1,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        opacity: [1, 0.5, 1],
        transition: { ease: 'easeInOut', duration: 0.45 },
      },
    },
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
  'default-loop': {
    group: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, -2, 0],
        transition: { ease: 'easeInOut', duration: 0.8 },
      },
    },
    lines: {
      initial: {
        opacity: 1,
      },
      animate: {
        opacity: [1, 0.5, 1],
        transition: { ease: 'easeInOut', duration: 0.8 },
      },
    },
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: FileTextProps) {
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
          d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.path
          d="M14 2v4a2 2 0 0 0 2 2h4"
          variants={variants.path2}
          initial="initial"
          animate={controls}
        />
        <motion.g variants={variants.lines} initial="initial" animate={controls}>
          <motion.path d="M10 9H8" />
          <motion.path d="M16 13H8" />
          <motion.path d="M16 17H8" />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}

function FileText(props: FileTextProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  FileText,
  FileText as FileTextIcon,
  type FileTextProps,
  type FileTextProps as FileTextIconProps,
};
