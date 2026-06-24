import { useSignal } from "@preact/signals";
import { styled } from "classname-variants/preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useId, useRef } from "preact/hooks";

export const SelectorTrigger = styled("button", {
  base: "selector-trigger",
  variants: {
    tone: {
      strong: "selector-trigger-strong",
      muted: "selector-trigger-muted",
    },
  },
  defaultVariants: {
    tone: "strong",
  },
  defaultProps: {
    type: "button",
  },
});

const SheetItem = styled("button", {
  base: "sheet-item",
  variants: {
    selected: {
      true: "active",
    },
  },
  defaultProps: {
    type: "button",
  },
});

interface SheetSelectProps<T> {
  title: string;
  items: readonly T[];
  selectedId: string;
  getId: (item: T) => string;
  trigger: ComponentChildren;
  onSelect: (item: T) => void;
  renderItem: (item: T) => ComponentChildren;
}

export function SheetSelect<T>({
  title,
  items,
  selectedId,
  getId,
  trigger,
  onSelect,
  renderItem,
}: SheetSelectProps<T>) {
  const titleId = useId();
  const open = useSignal(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = () => {
    open.value = false;
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open.value || !dialog || dialog.open) return;
    dialog.showModal();
    dialog.focus();
  }, [open.value]);

  return (
    <div class="sheet-select">
      <SelectorTrigger
        aria-haspopup="dialog"
        aria-expanded={open.value}
        onClick={() => {
          open.value = true;
        }}
      >
        {trigger}
        <span class="chevron">›</span>
      </SelectorTrigger>

      {open.value && (
        <dialog
          ref={dialogRef}
          class="sheet-dialog"
          tabIndex={-1}
          aria-labelledby={titleId}
          onCancel={close}
          onClick={(event: JSX.TargetedMouseEvent<HTMLDialogElement>) => {
            if (event.target === event.currentTarget) close();
          }}
          onKeyDown={(event: JSX.TargetedKeyboardEvent<HTMLDialogElement>) => {
            if (event.key === "Escape") close();
          }}
        >
          <section class="sheet">
            <h2 id={titleId} class="sheet-title">
              {title}
            </h2>
            {items.map((item) => {
              const id = getId(item);
              return (
                <SheetItem
                  key={id}
                  selected={id === selectedId}
                  onClick={() => {
                    onSelect(item);
                    close();
                  }}
                >
                  {renderItem(item)}
                </SheetItem>
              );
            })}
          </section>
        </dialog>
      )}
    </div>
  );
}
