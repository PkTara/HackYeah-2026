/**
 * Typing straight onto a Scoreboard. The board stays the pixel drawing; a
 * real TextInput with invisible text lies exactly over it, so a tap or click
 * on the number focuses it on the web, Android and iOS alike, and the keys
 * come from the system keyboard. The host draws what is typed.
 */
import { useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import type { ResultMethod } from '@hackyeah/core';
import { numberKeyboard } from './NumberField';

/**
 * What the typed text means: a number to save, a message saying why it
 * cannot be saved, or null when nothing has been typed yet.
 */
export type ReadTyped = (text: string) => number | string | null;

type EntryOptions = {
  /** The saved value; null when there is none. */
  value: number | null;
  /** How `value` was measured, so Escape can put it back exactly. */
  method?: ResultMethod;
  onChange: (value: number | null, method: ResultMethod) => void;
  read: ReadTyped;
};

/**
 * The typing rules both boards share.
 *
 * Each good number is saved as it is typed (method 'typed'), so Next or
 * Save work straight away. Escape, or finishing with nothing or something
 * out of range, puts back the value from before typing started. The error
 * line stays after that, so it is clear why the number did not change.
 */
export function useBoardEntry({ value, method, onChange, read }: EntryOptions) {
  /** What is typed, or null when not editing. */
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const before = useRef({ value, method });

  const restore = () => {
    const old = before.current;
    if (old.value !== value || old.method !== method) {
      onChange(old.value, old.method ?? 'typed');
    }
  };

  return {
    draft,
    error,
    editing: draft !== null,
    clearError: () => setError(null),
    begin: () => {
      before.current = { value, method };
      setDraft('');
      setError(null);
    },
    change: (text: string) => {
      setDraft(text);
      const typed = read(text);
      if (typeof typed === 'number') {
        setError(null);
        onChange(typed, 'typed');
      } else {
        setError(typed);
      }
    },
    end: (cancelled: boolean) => {
      const typed = read(draft ?? '');
      setDraft(null);
      if (cancelled) {
        setError(null);
        restore();
      } else if (typeof typed !== 'number') {
        restore();
      }
    },
  };
}

type Props = {
  /** What is typed, or null when not editing. */
  draft: string | null;
  onBegin: () => void;
  onChangeText: (text: string) => void;
  /** Enter, blur or a tap elsewhere end with false; Escape with true. */
  onEnd: (cancelled: boolean) => void;
  /** Allows one leading minus sign. */
  allowNegative?: boolean;
  maxLength: number;
  /** Read out while nothing is typed, e.g. the saved value in words. */
  placeholder?: string;
  accessibilityLabel: string;
  accessibilityHint: string;
};

/**
 * The invisible input over a board. Lay it inside the same parent as the
 * board; it fills that parent. Nothing typed starts out in it, so the
 * first digit replaces the old number, like selecting it all first.
 */
export function BoardInput({
  draft,
  onBegin,
  onChangeText,
  onEnd,
  allowNegative = false,
  maxLength,
  placeholder,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const input = useRef<TextInput>(null);
  // Enter both submits and blurs, so this makes sure it ends only once.
  const open = useRef(false);
  const finish = (cancelled: boolean) => {
    if (!open.current) {
      return;
    }
    open.current = false;
    onEnd(cancelled);
    input.current?.blur?.();
  };

  return (
    <TextInput
      ref={input}
      value={draft ?? ''}
      onChangeText={text => onChangeText(cleanNumber(text, allowNegative))}
      onFocus={() => {
        open.current = true;
        onBegin();
      }}
      onBlur={() => finish(false)}
      onSubmitEditing={() => finish(false)}
      onKeyPress={event => {
        if (event.nativeEvent.key === 'Escape') {
          finish(true);
        }
      }}
      {...numberKeyboard(allowNegative)}
      returnKeyType="done"
      maxLength={maxLength}
      placeholder={placeholder}
      placeholderTextColor="transparent"
      caretHidden
      selectionColor="transparent"
      autoCorrect={false}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={styles.input}
    />
  );
}

/** Digits only, with one leading minus when it is allowed. */
export function cleanNumber(text: string, allowNegative: boolean): string {
  const digits = text.replace(/\D/g, '');
  return allowNegative && text.trimStart().startsWith('-')
    ? `-${digits}`
    : digits;
}

const styles = StyleSheet.create({
  input: {
    ...StyleSheet.absoluteFillObject,
    // The board draws the number; the input itself shows nothing.
    color: 'transparent',
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
    padding: 0,
    // 16 or more keeps iOS Safari from zooming in on focus.
    fontSize: 20,
    textAlign: 'center',
  },
});
