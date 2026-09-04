export default function CalendarLoading() {
  return (
    <div
      className="ns-page-stack"
      aria-busy="true"
      aria-label="Caricamento calendario tornei"
    >
      <p className="ns-visually-hidden" role="status">
        Caricamento del calendario in corso…
      </p>
      <div className="ns-skeleton ns-skeleton--heading" />
      <div className="ns-skeleton-grid">
        <div className="ns-skeleton ns-skeleton--filters" />
        <div className="ns-calendar-skeleton">
          <div className="ns-skeleton ns-skeleton--toolbar" />
          <div className="ns-skeleton ns-skeleton--calendar" />
        </div>
      </div>
    </div>
  );
}
