import React from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface MotionSectionProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const MotionSection: React.FC<MotionSectionProps> = ({
  children,
  delay = 0,
  duration = 0.45,
  className = '',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const hasIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;

  if (shouldReduceMotion || !hasIntersectionObserver) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface MotionStaggerContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (staggerDelay = 0.08) => ({
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  }),
};

export const MotionStaggerContainer: React.FC<MotionStaggerContainerProps> = ({
  children,
  staggerDelay = 0.08,
  className = '',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const hasIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;

  if (shouldReduceMotion || !hasIntersectionObserver) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      custom={staggerDelay}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface MotionStaggerItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const MotionStaggerItem: React.FC<MotionStaggerItemProps> = ({
  children,
  className = '',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const hasIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;

  if (shouldReduceMotion || !hasIntersectionObserver) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
};
