export function formatCurrency(
  amount: number,
  locale = "fr-FR",
  currency = "EUR"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}


