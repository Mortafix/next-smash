import type { ReactNode } from "react";

type MainContainerProps = {
  children: ReactNode;
};

export function MainContainer({ children }: MainContainerProps) {
  return (
    <main id="contenuto-principale" className="app-main" tabIndex={-1}>
      <div className="shell-container">{children}</div>
    </main>
  );
}
