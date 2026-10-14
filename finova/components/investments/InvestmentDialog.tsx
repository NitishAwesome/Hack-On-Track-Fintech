'use client';

import { useRef, type ReactElement } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

/** Focus handling only; the existing forms own validation, payloads and mutations. */
export function InvestmentDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactElement;
}) {
  const restoreFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div className="investment-dialog-frame">
          <Dialog.Overlay className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            asChild
            aria-describedby={undefined}
            onOpenAutoFocus={() => {
              restoreFocus.current =
                document.activeElement instanceof HTMLElement ? document.activeElement : null;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (restoreFocus.current?.isConnected) restoreFocus.current.focus();
            }}
          >
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function InvestmentDialogTitle({ children }: { children: ReactElement }) {
  return <Dialog.Title asChild>{children}</Dialog.Title>;
}

export function InvestmentWriteFeedback({ message }: { message?: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-xl border border-loss/30 bg-loss/5 text-loss text-xs p-3 leading-relaxed"
    >
      {message}
    </p>
  ) : null;
}
