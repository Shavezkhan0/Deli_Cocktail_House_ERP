'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type UploadCloudProps = IconProps<keyof typeof animations>;

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
    arrow: {
      initial: {
        y: 0,
        opacity: 1,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        y: [0, 2, 0],
        opacity: [1, 0.6, 1],
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
    arrow: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, 2, 0],
        transition: { ease: 'easeInOut', duration: 0.8 },
      },
    },
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: UploadCloudProps) {
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
          d="M21 12a3 3 0 0 0-3-3h-1.6a5 5 0 0 0-9.8-1.6A4 4 0 0 0 6 15h1"
          variants={variants.path1}
          initial="initial"
          animate={controls}
        />
        <motion.g variants={variants.arrow} initial="initial" animate={controls}>
          <motion.path
            d="m17 16-5-5-5 5"
            variants={variants.path2}
            initial="initial"
            animate={controls}
          />
          <motion.path d="M12 11v9" />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}

function UploadCloud(props: UploadCloudProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  UploadCloud,
  UploadCloud as UploadCloudIcon,
  type UploadCloudProps,
  type UploadCloudProps as UploadCloudIconProps,
};
