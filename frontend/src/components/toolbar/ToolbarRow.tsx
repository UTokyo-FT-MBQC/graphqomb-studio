/**
 * ToolbarRow Component
 *
 * A container for toolbar items with consistent styling.
 * Used to create the two-row toolbar layout.
 */

"use client";

interface ToolbarRowProps {
  children: React.ReactNode;
  className?: string;
}

export function ToolbarRow({ children, className = "" }: ToolbarRowProps): React.ReactNode {
  return <div className={`flex items-center gap-4 px-4 py-1.5 ${className}`}>{children}</div>;
}

/**
 * Vertical divider for separating toolbar sections
 */
export function ToolbarDivider(): React.ReactNode {
  return <div className="h-6 w-px bg-gray-300" />;
}

/**
 * Spacer to push elements to the right
 */
export function ToolbarSpacer(): React.ReactNode {
  return <div className="flex-1" />;
}
