export default function ProfileLoading() {
  return (
    <div
      className="ns-page-stack ns-preferences ns-preferences-skeleton"
      aria-busy="true"
      aria-label="Caricamento profilo"
    >
      <p className="ns-visually-hidden" role="status">Caricamento del profilo in corso…</p>
      <div className="ns-skeleton ns-skeleton--heading" />
      <div className="ns-preferences-skeleton__saved-heading" />
      <div className="ns-skeleton ns-preferences-skeleton__empty" />
      <div className="ns-preferences-skeleton__saved-heading" />
      <div className="ns-skeleton ns-preferences-skeleton__empty" />
    </div>
  );
}
