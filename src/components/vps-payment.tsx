import { useEffect } from "react";
import { LNVpsApi, VmPayment } from "../api";
import QrCode from "./qr";
import useLogin from "../hooks/login";

export default function VpsPayment({
  payment,
  onPaid,
}: {
  payment: VmPayment;
  onPaid?: () => void;
}) {
  const login = useLogin();

  async function checkPayment(api: LNVpsApi) {
    try {
      const st = await api.paymentStatus(payment.id);
      if (st.is_paid) {
        onPaid?.();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }
  useEffect(() => {
    if (!login?.api) return;

    const tx = setInterval(async () => {
      if (await checkPayment(login.api)) {
        clearInterval(tx);
      }
    }, 2_000);
    return () => clearInterval(tx);
  }, [login, onPaid]);

  // Only works for Lightning payments
  if (!("lightning" in payment.data)) {
    return (
      <div className="text-cyber-danger">
        This component only supports Lightning payments
      </div>
    );
  }
  const invoice = payment.data.lightning;
  const ln = `lightning:${invoice}`;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-cyber-border p-3 bg-cyber-panel items-center">
      <QrCode
        data={ln}
        link={ln}
        width={512}
        height={512}
        avatar="/logo.jpg"
        className="cursor-pointer rounded-sm overflow-hidden"
      />
      <div className="flex flex-col items-center">
        <div className="text-cyber-primary">
          {((payment.amount + payment.tax) / 1000).toLocaleString()} sats
        </div>
        {payment.tax > 0 && (
          <div className="text-xs text-cyber-muted">
            including {(payment.tax / 1000).toLocaleString()} sats tax
          </div>
        )}
      </div>
      <div className="monospace select-all break-all text-center text-sm text-cyber-text">
        {invoice}
      </div>
    </div>
  );
}
