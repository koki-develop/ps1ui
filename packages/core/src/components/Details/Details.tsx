import type { ComponentProps, ReactNode } from "react";
import { cx } from "../../utils/cx";

export type DetailsProps = ComponentProps<"details"> & {
  summary: ReactNode;
};

export function Details({ summary, children, className, ...rest }: DetailsProps) {
  return (
    <details {...rest} className={cx("ps1ui-details", className)}>
      <summary className="ps1ui-details__summary">{summary}</summary>
      <div className="ps1ui-details__body">{children}</div>
    </details>
  );
}
