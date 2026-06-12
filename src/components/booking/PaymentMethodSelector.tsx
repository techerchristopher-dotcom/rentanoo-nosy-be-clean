import { CreditCard, Banknote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BookingPaymentMethod } from '@/services/supabase/bookings';
import { useExchangeRate } from '@/contexts/ExchangeRateContext';
import type { ListingKind } from '@/utils/listingTerminology';

interface PaymentMethodSelectorProps {
  value: BookingPaymentMethod;
  onChange: (value: BookingPaymentMethod) => void;
  savingsMga: number;
  disabled?: boolean;
  listingKind?: ListingKind;
}

export function PaymentMethodSelector({
  value,
  onChange,
  savingsMga,
  disabled = false,
  listingKind = 'car',
}: PaymentMethodSelectorProps) {
  const { t } = useTranslation('common');
  const { formatClientInline } = useExchangeRate();
  const isAccommodation = listingKind === 'accommodation';
  const cashOnSiteLabel = isAccommodation
    ? t('booking.paymentMethod.cashOnSite.accommodation.label')
    : t('booking.paymentMethod.cashOnSite.label');
  const cashOnSiteHint = isAccommodation
    ? t('booking.paymentMethod.cashOnSite.accommodation.hint')
    : t('booking.paymentMethod.cashOnSite.hint');

  const savingsLabel =
    savingsMga > 0
      ? t('booking.paymentMethod.savingsAmount', {
          amount: formatClientInline(savingsMga),
        })
      : null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">
        {t('booking.paymentMethod.title')}
      </p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as BookingPaymentMethod)}
        className="flex flex-col gap-2"
        disabled={disabled}
      >
        <Label
          htmlFor="payment-card-online"
          className={cn(
            'flex flex-col gap-1 rounded-lg border px-3 py-3 cursor-pointer transition-colors',
            value === 'card_online'
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border hover:bg-muted/40',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem
              value="card_online"
              id="payment-card-online"
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {t('booking.paymentMethod.cardOnline.label')}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0"
                >
                  {t('booking.paymentMethod.recommended')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('booking.paymentMethod.cardOnline.hint')}
              </p>
              {savingsLabel ? (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {savingsLabel}
                </p>
              ) : null}
            </div>
          </div>
        </Label>

        <Label
          htmlFor="payment-cash-on-site"
          className={cn(
            'flex flex-col gap-1 rounded-lg border px-3 py-3 cursor-pointer transition-colors',
            value === 'cash_on_site'
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border hover:bg-muted/40',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem
              value="cash_on_site"
              id="payment-cash-on-site"
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {cashOnSiteLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {cashOnSiteHint}
              </p>
            </div>
          </div>
        </Label>
      </RadioGroup>
    </div>
  );
}
