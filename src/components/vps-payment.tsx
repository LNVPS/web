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
  
  // Only works for Lightning payments
  if (!('lightning' in payment.data)) {
    return <div className="text-red-500">This component only supports Lightning payments</div>;
  }
  
  const invoice = payment.data.lightning;
  const ln = `lightning:${invoice}`;

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

  return (
    <div className="flex flex-col gap-4 rounded-xl p-3 bg-neutral-900 items-center">
      <QrCode
        data={ln}
        link={ln}
        width={512}
        height={512}
        avatar="/logo.jpg"
        className="cursor-pointer rounded-xl overflow-hidden"
      />
      <div className="flex flex-col items-center">
        <div>
          {((payment.amount + payment.tax) / 1000).toLocaleString()} sats
        </div>
        {payment.tax > 0 && (
          <div className="text-xs">
            including {(payment.tax / 1000).toLocaleString()} sats tax
          </div>
        )}
      </div>
      <div className="monospace select-all break-all text-center text-sm">
        {invoice}
      </div>
    </div>
  );
}
