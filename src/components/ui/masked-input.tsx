"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { MASKS, parseCurrency, parsePercent, type MaskName } from "@/lib/masks";

type MaskedInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value" | "defaultValue"
> & {
  mask: MaskName;
  defaultValue?: string | number | null;
  onValueChange?: (formatted: string) => void;
};

const numericMasks: Partial<
  Record<MaskName, (value: string) => number | null>
> = {
  currency: parseCurrency,
  percent: parsePercent,
};

/**
 * Campo com máscara do §5.2 (Fase 1.10).
 *
 * Para dinheiro e percentual o valor que vai ao servidor é o número puro,
 * enviado num campo escondido: assim as máscaras entram sem tocar em nenhuma
 * server action nem no schema de validação — o formulário continua mandando
 * `1234.56`, e só o que o usuário lê muda. Telefone e hora seguem enviando o
 * texto formatado, que é o que esses campos já guardavam.
 */
export function MaskedInput({
  mask,
  name,
  defaultValue,
  onValueChange,
  ...props
}: MaskedInputProps) {
  const format = MASKS[mask];
  const toNumber = numericMasks[mask];

  const [value, setValue] = React.useState(() =>
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : format(
          // Um número vindo do banco chega como 12.5; a máscara de moeda
          // trabalha em centavos, por isso a conversão antes de formatar.
          typeof defaultValue === "number" && mask === "currency"
            ? String(Math.round(defaultValue * 100))
            : String(defaultValue),
        ),
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = format(event.target.value);
    setValue(next);
    onValueChange?.(next);
  }

  const hiddenValue = toNumber ? String(toNumber(value) ?? "") : "";

  return (
    <>
      <Input
        {...props}
        // Sem `name` quando há campo escondido, para não mandar os dois.
        name={toNumber ? undefined : name}
        inputMode={props.inputMode ?? (mask === "phone" ? "tel" : "decimal")}
        value={value}
        onChange={handleChange}
      />
      {toNumber ? (
        <input type="hidden" name={name} value={hiddenValue} />
      ) : null}
    </>
  );
}
