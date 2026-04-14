"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDown,
  EyeOff,
  Check,
} from "lucide-react";
import type { Column } from "@tanstack/react-table";
import React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

function formatMovementTypeHeader(t: string) {
  if (!t) return "";
  const lower = t.toLowerCase().trim();

  if (lower === "edit") return "Edit Stock";
  if (lower === "edit vendor") return "Edit Vendor Stock";
  if (lower === "scan in") return "Scan In Stock";
  if (lower === "scan out") return "Scan Out Stock";
  if (lower === "scan in vendor") return "Scan In Vendor Stock";
  if (lower === "scan out vendor") return "Scan Out Vendor Stock";
  
  if (lower === "scan in (special)") return "Scan In Special";
  if (lower === "scan out (special)") return "Scan Out Special";
  if (lower === "edit (special)") return "Edit Stock Special";

  return t;
}

type NullString = {
  String: string;
  Valid: boolean;
};

type NullInt = {
  Int64: number;
  Valid: boolean;
};

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  
  const rawUniqueValues = Array.from(column.getFacetedUniqueValues().keys());

  
  const flattenedSet = new Set<unknown>();
  rawUniqueValues.forEach((val) => {
    if (Array.isArray(val)) {
      val.forEach((v) => flattenedSet.add(v));
    } else {
      flattenedSet.add(val);
    }
  });

  
  const uniqueValues = Array.from(flattenedSet).sort((a: unknown, b: unknown) => {
    if (typeof a === "number" && typeof b === "number") return a - b;
    
    
    const strA = typeof a === "object" ? JSON.stringify(a) : String(a);
    const strB = typeof b === "object" ? JSON.stringify(b) : String(b);
    
    return strA.localeCompare(strB);
  });

  const selectedValues = new Set(column.getFilterValue() as string[]);

  
  const getDisplayValue = (val: unknown): string => {
    if (val === null || val === undefined) {
      return "(Kosong)";
    }

    
    if (typeof val === "number") {
      return `Bin ${val}`;
    }

    
    if (column.id === "movementType" && typeof val === "string") {
      return formatMovementTypeHeader(val);
    }

    
    if (
      typeof val === "object" &&
      val !== null &&
      "Valid" in val &&
      "String" in val
    ) {
      const ns = val as NullString;
      return ns.Valid ? ns.String : "(Kosong)";
    }

    
    if (
      typeof val === "object" &&
      val !== null &&
      "Valid" in val &&
      "Int64" in val
    ) {
      const ni = val as NullInt;
      return ni.Valid ? `Bin ${ni.Int64}` : "(Kosong)";
    }

    
    if (typeof val === "string") {
      const date = new Date(val);
      if (!isNaN(date.getTime()) && val.includes("T") && val.includes("Z")) {
        return date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    return String(val);
  };

  
  const getKey = (val: unknown): string => {
    if (val === null) return "__null__";
    if (val === undefined) return "__undefined__";

    
    
    if (typeof val === "object") {
      return JSON.stringify(val);
    }

    return String(val);
  };

  const optionsWithKeys = uniqueValues.map((option) => ({
    key: getKey(option),
    displayValue: getDisplayValue(option),
  }));

  
  const uniqueOptionsMap = new Map<
    string,
    { key: string; displayValue: string }
  >();
  optionsWithKeys.forEach((item) => {
    if (!uniqueOptionsMap.has(item.displayValue)) {
      uniqueOptionsMap.set(item.displayValue, item);
    }
  });

  const uniqueOptions = Array.from(uniqueOptionsMap.values());

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {column.getCanFilter() ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
            >
              <span>{title}</span>
              {selectedValues.size > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 rounded-sm px-1 font-normal"
                >
                  {selectedValues.size}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[220px] p-0" align="start">
            <Command>
              <CommandInput placeholder={`Filter ${title}...`} />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {uniqueOptions.map((option) => {
                    const isSelected = selectedValues.has(option.displayValue);

                    return (
                      <CommandItem
                        key={option.key} 
                        onSelect={() => {
                          if (isSelected) {
                            selectedValues.delete(option.displayValue);
                          } else {
                            selectedValues.add(option.displayValue);
                          }
                          const filterValues = Array.from(selectedValues);
                          column.setFilterValue(
                            filterValues.length ? filterValues : undefined
                          );
                        }}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{option.displayValue}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {selectedValues.size > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => column.setFilterValue(undefined)}
                        className="justify-center text-center"
                      >
                        Clear filters
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <div className={cn(className, "pl-1")}>{title}</div>
      )}

      {column.getCanSort() && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 data-[state=open]:bg-accent"
            >
              <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Asc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Desc
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Hide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}