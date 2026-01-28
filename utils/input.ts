import React from "react";

/** DATE INPUT HANDLERS **/

export const dateHandleChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  i: number,
  dateInputs: { maxLength: number }[],
  dateInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
) => {
  const value = e.target.value.replace(/\D/, "");
  e.target.value = value;

  if (value.length >= dateInputs[i].maxLength && i < dateInputRefs.current.length - 1) {
    dateInputRefs.current[i + 1]?.focus();
  }
};

export const dateHandleKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  i: number,
  dateInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
) => {
  const value = (e.target as HTMLInputElement).value;

  if (e.key === "Backspace") {
    if (!value && i > 0) {
      const prevInput = dateInputRefs.current[i - 1];
      prevInput?.focus();
      if (prevInput) prevInput.value = prevInput.value.slice(0, prevInput.value.length - 1);
    }
  }
};

/** PASSCODE INPUT HANDLERS **/

export const passcodeHandleChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  index: number,
  refArray: React.MutableRefObject<(HTMLInputElement | null)[]>
) => {
  let value = e.target.value;
  if (!/^\d*$/.test(value)) {
    e.target.value = "";
    return;
  }
  e.target.value = value.slice(-1);
  if (value && index < refArray.current.length - 1) {
    refArray.current[index + 1]?.focus();
  }
};

export const passcodeHandleKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  index: number,
  refArray: React.MutableRefObject<(HTMLInputElement | null)[]>
) => {
  if (e.key === "Backspace" && !(e.target as HTMLInputElement).value && index > 0) {
    refArray.current[index - 1]?.focus();
  }
};
