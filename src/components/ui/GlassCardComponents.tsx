import * as React from "react";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const GlassCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <CardHeader ref={ref} className={cn(className)} {...props} />
  )
);
GlassCardHeader.displayName = "GlassCardHeader";

export const GlassCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <CardTitle ref={ref} className={cn(className)} {...props} />
  )
);
GlassCardTitle.displayName = "GlassCardTitle";

export const GlassCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <CardDescription ref={ref} className={cn(className)} {...props} />
  )
);
GlassCardDescription.displayName = "GlassCardDescription";

export const GlassCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <CardContent ref={ref} className={cn(className)} {...props} />
  )
);
GlassCardContent.displayName = "GlassCardContent";
