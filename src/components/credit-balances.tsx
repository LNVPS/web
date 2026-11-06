import type { AccountCredit } from "../api";
import { creditBalances } from "../utils/credit";
import { CostAmount } from "./cost";

export default function CreditBalances({
  credit,
  className,
  large,
}: {
  credit: AccountCredit;
  className?: string;
  large?: boolean;
}) {
  const [base, ...others] = creditBalances(credit);
  return (
    <div className={className} data-testid="credit-balances">
      <div className={large ? "text-3xl" : "text-lg"}>
        <CostAmount cost={{ currency: base.currency, amount: base.balance }} converted={false} />
      </div>
      {others.map((b) => (
        <div
          key={b.currency}
          className={large ? "text-lg text-cyber-text" : "text-sm"}
        >
          <CostAmount cost={{ currency: b.currency, amount: b.balance }} converted={false} />
        </div>
      ))}
    </div>
  );
}
