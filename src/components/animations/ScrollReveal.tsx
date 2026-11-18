'use client';

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionProps,
  type Transition,
  type Variants,
} from 'motion/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealOptions {
  /** Direction the element travels FROM. 'none' = fade only. Default 'up'. */
  direction?: RevealDirection;
  /** Travel distance in px. Default 24. */
  distance?: number;
  /** Initial scale (e.g. 0.95). Omit for no scaling. */
  scale?: number;
  /** Initial blur in px. Default 0 (no blur filter is applied). */
  blur?: number;
  /**
   * Seconds. Default 0. Ignored inside a ScrollRevealGroup: set `delay` and
   * `stagger` on the group instead.
   */
  delay?: number;
  /** Seconds. Default 0.5. */
  duration?: number;
  /** Any motion easing. Default cubic-bezier(0.25, 0.1, 0.25, 1). */
  ease?: Transition['ease'];
  /**
   * Scroll parallax in px. The element drifts from +n (below) to -n (above)
   * while it passes through the viewport, i.e. it nudges upward as you scroll.
   * Default 0 = off. Runs independently of the reveal animation.
   */
  parallax?: number;
}

interface ViewportOptions {
  /** Animate only the first time it enters the viewport. Default true. */
  once?: boolean;
  /** How much of the element must be visible: 'some' | 'all' | 0-1. Default 'some'. */
  amount?: 'some' | 'all' | number;
  /** IntersectionObserver rootMargin. Default '0px 0px -60px 0px'. */
  margin?: string;
  /** Scroll container to observe against. Default: the window. */
  root?: RefObject<Element | null>;
}

interface CommonOwnProps {
  /** Render this tag or component instead of a <div>. */
  as?: ElementType;
  /** Skip the animation entirely and render the element as-is. */
  disabled?: boolean;
  children?: ReactNode;
}

type OwnProps = CommonOwnProps & RevealOptions & ViewportOptions;

type Polymorphic<T extends ElementType, Own> = Own &
  Omit<ComponentPropsWithoutRef<T>, keyof Own | keyof MotionProps> &
  MotionProps;

export type ScrollRevealProps<T extends ElementType = 'div'> = Polymorphic<
  T,
  OwnProps & { as?: T }
>;

export type ScrollRevealGroupProps<T extends ElementType = 'div'> = Polymorphic<
  T,
  CommonOwnProps &
    ViewportOptions & {
      as?: T;
      /** Seconds between each child. Default 0.08. */
      stagger?: number;
      /** Seconds before the first child starts. Default 0. */
      delay?: number;
    }
>;

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const DEFAULT_EASE: NonNullable<Transition['ease']> = [0.25, 0.1, 0.25, 1];

/** motion.create() must not be called during render, so cache per tag/component. */
const motionCache = new Map<ElementType, ElementType>();

function getMotionComponent(as: ElementType): ElementType {
  let component = motionCache.get(as);
  if (!component) {
    component = motion.create(as as any) as unknown as ElementType;
    motionCache.set(as, component);
  }
  return component;
}

/** True when a ScrollReveal sits inside a ScrollRevealGroup. */
const GroupContext = createContext(false);

function offsetFor(
  direction: RevealDirection,
  distance: number,
): Record<string, number> {
  switch (direction) {
    case 'up':
      return { y: distance };
    case 'down':
      return { y: -distance };
    case 'left':
      return { x: distance };
    case 'right':
      return { x: -distance };
    default:
      return {};
  }
}

function buildVariants({
  direction,
  distance,
  scale,
  blur,
  delay,
  duration,
  ease,
  reduceMotion,
  inGroup,
}: Required<Pick<RevealOptions, 'direction' | 'distance' | 'blur' | 'delay' | 'duration' | 'ease'>> &
  Pick<RevealOptions, 'scale'> & { reduceMotion: boolean; inGroup: boolean }): Variants {
  // Inside a group the parent's stagger arrives as the child's transition delay.
  // An explicit `delay` key on the child (even 0) would override it, which is what
  // made every item start together. So children in a group must NOT set `delay`.
  const delayProp = inGroup ? {} : { delay };

  // Reduced motion: opacity only, no travel / scale / blur
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.2, ...delayProp } },
    };
  }

  const hidden: Record<string, number | string> = {
    opacity: 0,
    ...offsetFor(direction, distance),
  };
  const visible: Record<string, number | string | Transition> = { opacity: 1 };

  if (direction === 'up' || direction === 'down') visible.y = 0;
  if (direction === 'left' || direction === 'right') visible.x = 0;

  if (scale !== undefined && scale !== 1) {
    hidden.scale = scale;
    visible.scale = 1;
  }
  if (blur > 0) {
    hidden.filter = `blur(${blur}px)`;
    visible.filter = 'blur(0px)';
  }

  visible.transition = { duration, ease, ...delayProp };
  return { hidden, visible } as Variants;
}

// ---------------------------------------------------------------------------
// ScrollReveal
// ---------------------------------------------------------------------------

export default function ScrollReveal<T extends ElementType = 'div'>({
  as,
  direction = 'up',
  distance = 24,
  scale,
  blur = 0,
  delay = 0,
  duration = 0.5,
  ease = DEFAULT_EASE,
  parallax = 0,
  once = true,
  amount,
  margin = '0px 0px -60px 0px',
  root,
  disabled = false,
  children,
  ...rest
}: ScrollRevealProps<T>) {
  const inGroup = useContext(GroupContext);
  const reduceMotion = useReducedMotion() ?? false;
  const Component = getMotionComponent(as ?? 'div') as ElementType;

  // Parallax uses the CSS `translate` property, not `transform`, so it stacks
  // with the reveal's y/x/scale instead of fighting over the same transform.
  const { style: userStyle, ref: userRef, ...restProps } = rest as Record<
    string,
    any
  >;
  const localRef = useRef<HTMLElement | null>(null);
  const mergedRef = useMemo(
    () => (node: HTMLElement | null) => {
      localRef.current = node;
      if (typeof userRef === 'function') userRef(node);
      else if (userRef) userRef.current = node;
    },
    [userRef],
  );
  const { scrollYProgress } = useScroll({
    target: localRef,
    offset: ['start end', 'end start'],
  });
  const translate = useTransform(scrollYProgress, [0, 1], [
    `0px ${parallax}px`,
    `0px ${-parallax}px`,
  ]);
  const parallaxActive = parallax !== 0 && !reduceMotion && !disabled;

  const variants = buildVariants({
    direction,
    distance,
    scale,
    blur,
    delay,
    duration,
    ease,
    reduceMotion,
    inGroup,
  });

  // Inside a group the parent drives hidden -> visible; standalone, we observe.
  const animationProps: MotionProps = disabled
    ? { initial: false }
    : inGroup
      ? { variants }
      : {
          variants,
          initial: 'hidden',
          whileInView: 'visible',
          viewport: { once, amount, margin, root: root as RefObject<Element> },
        };

  // `restProps` comes last so callers can override anything (variants, transition, ...)
  return (
    <Component
      {...animationProps}
      {...restProps}
      ref={mergedRef}
      style={parallaxActive ? { ...userStyle, translate } : userStyle}
    >
      {children}
    </Component>
  );
}

// ---------------------------------------------------------------------------
// ScrollRevealGroup: staggers every ScrollReveal inside it
// ---------------------------------------------------------------------------

export function ScrollRevealGroup<T extends ElementType = 'div'>({
  as,
  stagger = 0.08,
  delay = 0,
  once = true,
  amount,
  margin = '0px 0px -60px 0px',
  root,
  disabled = false,
  children,
  ...rest
}: ScrollRevealGroupProps<T>) {
  const parentInGroup = useContext(GroupContext);
  const Component = getMotionComponent(as ?? 'div') as ElementType;

  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  const animationProps: MotionProps = disabled
    ? { initial: false }
    : parentInGroup
      ? { variants }
      : {
          variants,
          initial: 'hidden',
          whileInView: 'visible',
          viewport: { once, amount, margin, root: root as RefObject<Element> },
        };

  return (
    <GroupContext.Provider value={!disabled}>
      <Component {...animationProps} {...(rest as object)}>
        {children}
      </Component>
    </GroupContext.Provider>
  );
}