import { VisitCounter } from "@/components/shell/visit-counter";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell-container site-footer__inner">
        <p>
          NextSmash aggrega tornei FITP e TPRA. Verifica sempre i dettagli sul sito
          ufficiale.
        </p>
        <p>
          Coordinate comunali © ISTAT, CC BY 4.0 · <VisitCounter />
        </p>
      </div>
    </footer>
  );
}
