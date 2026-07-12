import type { ComponentProps } from "react";

export function Button({ className, ...rest }: ComponentProps<"button">) {
  return <button {...rest} className={`poiui-button ${className ?? ""}`} />;
}
