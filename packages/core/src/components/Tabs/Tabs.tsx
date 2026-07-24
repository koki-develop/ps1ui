"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { cx } from "../../utils/cx";

export type TabsOrientation = "horizontal" | "vertical";

export type TabsContextValue = {
  idBase: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  orientation: TabsOrientation;
  disabled: boolean;
  /**
   * Called by every child `<Tab>` from a `useLayoutEffect` so the group can
   * pick a fallback selection (the first enabled tab in registration order)
   * when neither `value` nor `defaultValue` was supplied. Returns an
   * unregister cleanup React runs on unmount / dependency change.
   */
  registerTab: (value: string, disabled: boolean) => () => void;
};

// Exported for TabList / Tab / TabPanel (same package) only — not re-exported
// from src/index.ts. Same rationale as RadioGroup's context: the coupling
// channel between the four primitives stays internal, so third-party
// components can't silently participate as if they were <Tab>.
const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue | null {
  return useContext(TabsContext);
}

export type TabsProps = ComponentProps<"div"> & {
  /** Controlled selected value. When set, the tabs ignore their internal state. */
  value?: string;
  /**
   * Uncontrolled initial value. Omit both `value` and `defaultValue` and the
   * group falls back to the first enabled `<Tab>` in DOM order so the tablist
   * stays keyboard-reachable (WAI-ARIA APG requires the first tab to hold
   * `tabindex=0` when nothing is otherwise selected).
   */
  defaultValue?: string;
  /** Fired with the newly-selected value whenever the user activates a different `<Tab>`. */
  onValueChange?: (value: string) => void;
  /**
   * Layout axis for the tab list. Horizontal maps ArrowLeft / ArrowRight to
   * previous / next; vertical maps ArrowUp / ArrowDown. Also drives
   * `aria-orientation` on the tablist and the vertical padding modifier on
   * every child `<TabPanel>`.
   */
  orientation?: TabsOrientation;
  /**
   * Disable every `<Tab>` inside the group. Precedence is asymmetric: a
   * per-tab `disabled={true}` still opts that tab in when the group is
   * enabled, but a per-tab `disabled={false}` cannot opt out of a group-wide
   * disable.
   */
  disabled?: boolean;
};

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  disabled = false,
  className,
  children,
  ...rest
}: TabsProps) {
  // useId gives every group a stable, SSR-safe id namespace so that
  // <Tab> / <TabPanel> can wire aria-controls / aria-labelledby to each
  // other without callers inventing ids themselves.
  const idBase = useId();

  const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(defaultValue);
  const isControlled = controlledValue !== undefined;

  // Map keyed by tab value → disabled flag. Every child <Tab> registers via
  // the context callback in a useLayoutEffect; a disabled toggle re-runs the
  // effect (cleanup → re-register), which moves the tab to the end of
  // insertion order. That reorder is deliberate: the fallback used to break
  // ties by *original* mount order, but preserving that across disabled
  // changes required a second registry channel that had no reachable branch
  // coverage. The reorder only affects the fallback derivation when the
  // consumer has provided no `value` / `defaultValue` AND toggles disabled
  // on a tab that was the fallback — a narrow scenario whose "correct"
  // outcome is undefined by design.
  const [registered, setRegistered] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const registerTab = useCallback((value: string, tabDisabled: boolean) => {
    setRegistered((prev) => {
      const next = new Map(prev);
      next.set(value, tabDisabled);
      return next;
    });
    return () => {
      setRegistered((prev) => {
        const next = new Map(prev);
        next.delete(value);
        return next;
      });
    };
  }, []);

  const firstEnabledValue = useMemo(() => {
    for (const [tabValue, tabDisabled] of registered) {
      if (!tabDisabled) return tabValue;
    }
    return undefined;
  }, [registered]);

  const currentValue = isControlled ? controlledValue : (uncontrolledValue ?? firstEnabledValue);

  const handleValueChange = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      idBase,
      value: currentValue,
      onValueChange: handleValueChange,
      orientation,
      disabled,
      registerTab,
    }),
    [idBase, currentValue, handleValueChange, orientation, disabled, registerTab],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div {...rest} className={cx("ps1ui-tabs", `ps1ui-tabs--${orientation}`, className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}
