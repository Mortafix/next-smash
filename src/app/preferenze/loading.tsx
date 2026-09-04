export default function PreferencesLoading() {
  return (
    <div
      className="ns-page-stack ns-preferences ns-preferences-skeleton"
      aria-busy="true"
      aria-label="Caricamento preferenze"
    >
      <p className="ns-visually-hidden" role="status">
        Caricamento delle preferenze in corso…
      </p>
      <div className="ns-skeleton ns-skeleton--heading" />
      <div className="ns-preferences-skeleton__section">
        <div className="ns-preferences-skeleton__section-heading" />
        <div className="ns-preferences-skeleton__body">
          <div className="ns-preferences-skeleton__copy" />
          <div className="ns-preferences-skeleton__board">
            <div />
            <div />
          </div>
        </div>
      </div>
      <div className="ns-preferences-skeleton__saved-heading" />
      <div className="ns-skeleton ns-preferences-skeleton__empty" />
    </div>
  );
}
