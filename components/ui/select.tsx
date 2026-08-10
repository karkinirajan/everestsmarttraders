"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Select<TValue = unknown>(props: SelectPrimitive.Root.Props<TValue>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-field text-foreground px-3 py-1 text-sm",
        "transition-colors outline-none cursor-pointer",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        "[&>span]:truncate",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
    </SelectPrimitive.Trigger>
  );
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectPortal(props: SelectPrimitive.Portal.Props) {
  return <SelectPrimitive.Portal {...props} />;
}

function SelectPositioner(props: SelectPrimitive.Positioner.Props) {
  return (
    <SelectPrimitive.Positioner
      sideOffset={4}
      className="z-50 w-[var(--anchor-width)] min-w-[8rem]"
      {...props}
    />
  );
}

function SelectPopup({ className, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Popup
      data-slot="select-popup"
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        "transition-opacity duration-150",
        className
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center rounded-md py-1.5 pl-8 pr-2 text-sm",
        "outline-none select-none",
        "hover:bg-accent hover:text-accent-foreground",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectItem,
  SelectSeparator,
};
