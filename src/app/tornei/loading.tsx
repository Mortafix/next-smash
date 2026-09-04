export default function TournamentsLoading() {
  return (
    <div className="ns-page-stack" aria-busy="true" aria-label="Caricamento tornei">
      <p className="ns-visually-hidden" role="status">
        Caricamento dei tornei in corso…
      </p>
      <div className="ns-skeleton ns-skeleton--heading" />
      <div className="ns-skeleton ns-skeleton--toolbar" />
      <div className="ns-skeleton-grid">
        <div className="ns-skeleton ns-skeleton--filters" />
        <div className="ns-skeleton-list">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="ns-skeleton ns-skeleton--card" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
