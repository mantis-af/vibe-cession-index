"use client";

import { motion, useInView, useSpring, useMotionValue, useTransform } from "framer-motion";
import { useRef, useEffect, useState, type ReactNode } from "react";

// --- Fade + slide in on scroll ---
export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-60px" });

  const directionOffset = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        ...directionOffset[direction],
      }}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, ...directionOffset[direction] }
      }
      transition={{
        duration: 0.7,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Staggered children container ---
export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.08,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Animated counter ---
export function CountUp({
  target,
  duration = 2,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  target: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      motionValue.set(target);
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated, motionValue, target]);

  return <motion.span ref={ref} className={className}>{display}</motion.span>;
}

// --- Glow pulse on a score ---
export function GlowScore({
  score,
  color,
  size = "lg",
  className = "",
}: {
  score: number;
  color: string;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClasses = {
    md: "text-4xl",
    lg: "text-6xl",
    xl: "text-8xl",
  };
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: color }}
      />
      <span
        className={`relative font-mono font-black tabular-nums tracking-tighter ${sizeClasses[size]}`}
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// --- Horizontal scroll progress bar ---
export function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(window.scrollY / totalHeight);
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 z-[100] origin-left"
      style={{ scaleX: scrollProgress }}
    />
  );
}
