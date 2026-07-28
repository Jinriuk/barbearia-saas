"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tabela do painel. Com `responsive` (padrão) ela vira lista de cartões
 * abaixo de sm — §10 e §12 não admitem tabela essencial que só se lê
 * rolando na horizontal no celular (Fase 1.11). O empilhamento em si está
 * em globals.css; aqui só entra o marcador que ele usa.
 *
 * Cada <TableCell> deve levar `data-label` com o texto do cabeçalho, que é
 * o rótulo mostrado ao lado do valor no modo empilhado. Célula sem
 * `data-label` vira título do cartão — use nas colunas de nome e de ações.
 */
function Table({
  className,
  responsive = true,
  ...props
}: React.ComponentProps<"table"> & { responsive?: boolean }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full",
        responsive ? "sm:overflow-x-auto" : "overflow-x-auto",
      )}
    >
      <table
        data-slot="table"
        data-responsive={responsive}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
