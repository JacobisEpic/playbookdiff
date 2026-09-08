"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Nothing to subscribe to: this reads a capability, not a changing value. The
// server snapshot is `false` on purpose, so the control is absent from the
// prerendered markup and only ever appears where it can actually work.
const noSubscription = () => () => {};
const clipboardOnClient = () => Boolean(navigator.clipboard);
const clipboardOnServer = () => false;

/**
 * The copy control on a command block.
 *
 * It renders nothing until it is on a client that has a clipboard to write to,
 * so a page without JavaScript, or a context where the Clipboard API is not
 * available, shows the command exactly as it always did rather than a button
 * that does nothing. The command is plain text in the markup and stays
 * selectable either way; this only saves the selecting.
 *
 * What it copies is the command string the block was given, not what the block
 * renders: the `$` prompts are decorative, and a pasted transcript is not a
 * command anyone can run.
 */
export function CopyCommand({ text }: { text: string }) {
  const available = useSyncExternalStore(noSubscription, clipboardOnClient, clipboardOnServer);
  const [copied, setCopied] = useState(false);
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(reset.current), []);

  if (!available) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // A denied or unavailable clipboard is not worth reporting: the command
      // is still on the page to select.
      return;
    }
    setCopied(true);
    clearTimeout(reset.current);
    reset.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className="command-copy"
      type="button"
      onClick={copy}
      data-copied={copied}
      aria-label={copied ? "Command copied" : "Copy command"}
    >
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
        {copied ? (
          <path
            d="M2.5 8.5 6 12l7.5-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <g fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="5.6" y="1.9" width="8.5" height="8.5" rx="2" />
            <path d="M10.4 13.4a1.7 1.7 0 0 1-1.7 1.7H3.6a1.7 1.7 0 0 1-1.7-1.7V6.9a1.7 1.7 0 0 1 1.7-1.7" />
          </g>
        )}
      </svg>
      <span aria-hidden="true">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
