import type { ReactNode } from 'react';

export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return <details className="crm-help"><summary>{label}</summary><div>{children}</div></details>;
}
