import { ReactNode } from "react";
import { Card, CardBody, CardTitle } from "./card";

/**
 * Shared account-page chrome so every account surface reads the same: a page
 * title + description at the top, uppercase section eyebrows, and bordered
 * section cards. See docs/billing-design-system.md for the vocabulary.
 */

/** The title block at the top of an account page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl text-cyber-primary">{title}</h1>
        {description && (
          <p className="mt-1 mb-0 text-sm text-cyber-muted">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

/** A small uppercase section marker. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-primary">
      {children}
    </div>
  );
}

/** A bordered panel with an uppercase eyebrow, title and optional description.
 * The standard container for a block of account content. */
export function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardTitle right={actions}>
        {eyebrow ? (
          <>
            {eyebrow}
            <span className="mx-1.5 text-cyber-border">·</span>
            {title}
          </>
        ) : (
          title
        )}
      </CardTitle>
      <CardBody className="p-5">
        {description && (
          <div className="mb-4 text-sm text-cyber-muted">{description}</div>
        )}
        {children}
      </CardBody>
    </Card>
  );
}
