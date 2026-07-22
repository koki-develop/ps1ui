"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from "react";
import { cx } from "../../utils/cx";

export type RadioGroupContextValue = {
  name: string;
  value: string | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
};

// Exported for Radio (same package) only — not re-exported from src/index.ts.
// The context is the coupling channel between the two components; keeping the
// hook internal prevents third-party components from silently participating
// as if they were <Radio>.
const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroupContext(): RadioGroupContextValue | null {
  return useContext(RadioGroupContext);
}

export type RadioGroupProps = ComponentProps<"div"> & {
  /** Shared `name` attribute applied to every child `<Radio>`. Auto-generated when omitted. */
  name?: string;
  /** Controlled selected value. When set, the group ignores its internal state. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fired with the newly-selected value whenever the user picks a different `<Radio>`. */
  onValueChange?: (value: string) => void;
  /**
   * Disable every `<Radio>` inside the group. Precedence is asymmetric: a per-radio
   * `disabled={true}` still opts that radio in when the group is enabled, but a
   * per-radio `disabled={false}` cannot opt out of a group-wide disable.
   */
  disabled?: boolean;
};

export function RadioGroup({
  name: nameProp,
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  children,
  ...rest
}: RadioGroupProps) {
  // useId gives every uncontrolled-name group a stable, SSR-safe `name`
  // attribute so child <input type=radio> nodes share it without a caller
  // needing to invent one.
  const autoName = useId();
  const name = nameProp ?? autoName;

  const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      if (!isControlled) setUncontrolledValue(nextValue);
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  const contextValue = useMemo<RadioGroupContextValue>(
    () => ({ name, value: currentValue, onChange: handleChange, disabled }),
    [name, currentValue, handleChange, disabled],
  );

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div {...rest} role="radiogroup" className={cx("ps1ui-radio-group", className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}
