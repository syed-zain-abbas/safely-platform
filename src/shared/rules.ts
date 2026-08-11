import { normalizeDomainInput } from "./url-normalization";

export function normalizeDomain(input: string): string | null {
  return normalizeDomainInput(input);
}
