import * as React from "react";
import { Button as ButtonBase } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ButtonContext = React.createContext<{
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}>({});

export function ButtonProvider({
  variant,
  children,
}: {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  children: React.ReactNode;
}) {
  return (
    <ButtonContext.Provider value={{ variant }}>
      {children}
    </ButtonContext.Provider>
  );
}

export function Button(
  props: React.ComponentProps<typeof ButtonBase> & {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  }
) {
  const ctx = React.useContext(ButtonContext);
  const variant = props.variant ?? ctx.variant ?? "default";
  
  return <ButtonBase {...props} className={cn(props.className, variant)} />;
}