"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterCommandPopoverClass,
  FILTER_COMMAND_INPUT_WRAPPER_CLASS,
  READABLE_POPOVER_ITEM_CLASS,
} from "@/lib/ui/popover-readability-styles";

export type ProductOwnerOption = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type ProductOwnerSelectProps = {
  options: ProductOwnerOption[];
  selectedOwnerId: string;
  onOwnerChange: (ownerId: string) => void;
  triggerClassName?: string;
};

/**
 * Fixed circle avatar (no stretch with name/email height).
 * Trigger + dropdown both show name + muted email (avatar size locked).
 */
function OwnerPickerRow({
  owner,
  showEmail = true,
}: {
  owner: ProductOwnerOption;
  showEmail?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
      <span className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
        <span className="truncate text-sm text-gray-700 dark:text-white">
          {owner.name}
        </span>
        {showEmail && owner.email ? (
          <span className="truncate text-xs text-muted-foreground dark:text-white/80">
            {owner.email}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * Searchable product-owner picker for client browse.
 * CommandList caps height so large owner lists do not block the main thread.
 */
export function ProductOwnerSelect({
  options,
  selectedOwnerId,
  onOwnerChange,
  triggerClassName,
}: ProductOwnerSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOwner = React.useMemo(
    () => options.find((a) => a.id === selectedOwnerId),
    [options, selectedOwnerId],
  );

  const handleSelect = React.useCallback(
    (ownerId: string) => {
      onOwnerChange(ownerId);
      setOpen(false);
    },
    [onOwnerChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            // min-h-10 — name+email stack; avatar stays fixed circle (no stretch)
            "h-auto min-h-10 w-full gap-2 px-3 py-1.5 sm:w-auto",
            triggerClassName,
          )}
        >
          {selectedOwner ? (
            <OwnerPickerRow owner={selectedOwner} />
          ) : (
            <span>Product Owner</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          "p-0 w-[min(100vw-2rem,320px)]",
          filterCommandPopoverClass("violet"),
          FILTER_COMMAND_INPUT_WRAPPER_CLASS,
        )}
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search product owner..."
            className="bg-transparent border-0 focus:ring-0 text-gray-700 dark:text-white/80 placeholder:text-gray-500 dark:placeholder:text-white/40"
          />
          <CommandList className="max-h-[min(60vh,280px)]">
            <CommandEmpty className="text-gray-600 dark:text-white/80 text-sm text-center p-5">
              No product owner found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((owner) => (
                <CommandItem
                  key={owner.id}
                  value={`${owner.name} ${owner.email}`}
                  onSelect={() => handleSelect(owner.id)}
                  className={READABLE_POPOVER_ITEM_CLASS}
                >
                  <OwnerPickerRow owner={owner} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
