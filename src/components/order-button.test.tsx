import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import type { ReactNode } from "react";
import { EmailGateNotice, OrderButton } from "./order-button";

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <IntlProvider locale="en" defaultLocale="en">
      {node}
    </IntlProvider>,
  );

const REASON = "Verify your email to order.";

describe("OrderButton", () => {
  test("is disabled for an unverified email", () => {
    const html = render(<OrderButton ready gate="required" />);
    expect(html).toContain("disabled");
  });

  test("is enabled for a verified email", () => {
    const html = render(<OrderButton ready gate="ok" />);
    expect(html).not.toContain("disabled");
  });

  test("is disabled while the account loads", () => {
    expect(render(<OrderButton ready gate="loading" />)).toContain("disabled");
  });

  test("stays disabled when the order is not ready", () => {
    expect(render(<OrderButton ready={false} gate="ok" />)).toContain(
      "disabled",
    );
  });
});

describe("EmailGateNotice", () => {
  test("says why the order is blocked", () => {
    expect(render(<EmailGateNotice gate="required" />)).toContain(REASON);
  });

  test("is empty once the email is verified", () => {
    expect(render(<EmailGateNotice gate="ok" />)).toBe("");
  });
});
