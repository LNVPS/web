import { MachineSpec } from "../api";

import "./pay-button.css"

declare global {
    interface Window {
        btcpay?: {
            appendInvoiceFrame(invoiceId: string): void;
        }
    }
}

export default function VpsPayButton({ spec }: { spec: MachineSpec }) {
    const serverUrl = "https://btcpay.v0l.io/api/v1/invoices";

    function handleFormSubmit(event: React.FormEvent) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200 && this.responseText) {
                window.btcpay?.appendInvoiceFrame(JSON.parse(this.responseText).invoiceId);
            }
        };
        xhttp.open('POST', serverUrl, true);
        xhttp.send(new FormData(form));
    }

    return <form method="POST" action={serverUrl} className="btcpay-form btcpay-form--block" onSubmit={handleFormSubmit}>
        <input type="hidden" name="storeId" value="CdaHy1puLx4kLC9BG3A9mu88XNyLJukMJRuuhAfbDrxg" />
        <input type="hidden" name="jsonResponse" value="true" />
        <input type="hidden" name="orderId" value={spec.id} />
        <input type="hidden" name="price" value={spec.cost.count} />
        <input type="hidden" name="currency" value={spec.cost.currency} />
        <input type="image" className="submit" name="submit" src="https://btcpay.v0l.io/img/paybutton/pay.svg"
            alt="Pay with BTCPay Server, a Self-Hosted Bitcoin Payment Processor" />
    </form>
}