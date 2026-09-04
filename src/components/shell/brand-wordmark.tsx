import styles from "./brand-wordmark.module.css";

type BrandWordmarkProps = {
  className?: string;
  showTagline?: boolean;
};

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export function BrandWordmark({
  className,
  showTagline = true,
}: BrandWordmarkProps) {
  return (
    <span className={cx(styles.root, className)} aria-hidden="true">
      <span className={styles.nameRow}>
        <span className={styles.next}>NEXT</span>
        <span className={styles.slash} />
        <span className={styles.smash}>SMASH</span>
      </span>

      {showTagline ? (
        <span className={styles.tagline}>
          Trova il prossimo torneo
        </span>
      ) : null}
    </span>
  );
}
