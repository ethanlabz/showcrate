import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-sans text-sm font-medium transition-all duration-300 ease-in-out',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    // `disabled:` only matches real <button>s; this covers rendered <a> etc.
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
    'cursor-pointer',
  ],
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:bg-accent-hover',
        outline:
          'border-2 border-border-strong bg-transparent hover:border-accent hover:bg-accent/10',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        ghost: 'hover:bg-accent/20',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        xs: 'h-7 gap-1 rounded px-2 text-xs [&_svg]:h-3 [&_svg]:w-3',
        sm: 'h-8 gap-1.5 px-3 text-xs',
        lg: 'px-8 py-3',
        icon: 'h-9 w-9',
        'icon-xs': 'h-7 w-7 rounded [&_svg]:h-3 [&_svg]:w-3',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Helpers for the `render` prop
// ---------------------------------------------------------------------------

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const r of refs) {
      if (typeof r === 'function') r(node);
      else if (r) (r as React.MutableRefObject<T | null>).current = node;
    }
  };
}

/** React 19 keeps `ref` in props; React 18 keeps it on the element. */
function getElementRef(el: React.ReactElement): React.Ref<any> | undefined {
  const major = parseInt(React.version, 10);
  return major >= 19 ? (el.props as any).ref : (el as any).ref;
}

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render a different element with the button's styles and props,
   * e.g. `<Button render={<Link href="/work" />}>Work</Button>`.
   * The element must forward its ref and spread its props (next/link does).
   */
  render?: React.ReactElement;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, type, render, disabled, children, ...props },
    ref,
  ) => {
    const childRef = render ? getElementRef(render) : undefined;
    const mergedRef = React.useMemo(
      () => mergeRefs<any>(ref, childRef),
      [ref, childRef],
    );

    const classes = cn(buttonVariants({ variant, size }), className);
    const dataAttrs = {
      'data-variant': variant ?? 'default',
      'data-size': size ?? 'default',
    };

    if (render && React.isValidElement(render)) {
      const rp = render.props as Record<string, any>;
      const sp = props as Record<string, any>;
      const merged: Record<string, any> = { ...sp, ...dataAttrs, ...rp };

      // Run both handlers; ours is skipped if the rendered element prevented default
      for (const key of Object.keys(sp)) {
        if (
          /^on[A-Z]/.test(key) &&
          typeof sp[key] === 'function' &&
          typeof rp[key] === 'function'
        ) {
          merged[key] = (e: any) => {
            rp[key](e);
            if (!e?.defaultPrevented) sp[key](e);
          };
        }
      }

      if (sp.style || rp.style) merged.style = { ...sp.style, ...rp.style };

      if (disabled) {
        merged['aria-disabled'] = true;
        merged.tabIndex = -1;
        merged.onClick = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        };
      }

      return React.cloneElement(render, {
        ...merged,
        ref: mergedRef,
        className: cn(classes, rp.className),
        children: rp.children ?? children,
      } as any);
    }

    return (
      <button
        ref={ref}
        // Default to type="button" so it never submits a form by accident
        type={type ?? 'button'}
        disabled={disabled}
        {...dataAttrs}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };