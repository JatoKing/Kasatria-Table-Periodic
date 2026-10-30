import { NET_WORTH_TIER_STYLES, NET_WORTH_TIERS } from '@/lib/people/net-worth';
import styles from './NetWorthLegend.module.css';

/** Low → High colour key from Image B, with the band each colour stands for. */
export function NetWorthLegend() {
  return (
    <div className={styles.legend} role="group" aria-label="Net worth colour key">
      <span className={styles.end}>Low</span>
      <ul className={styles.bands}>
        {NET_WORTH_TIERS.map((tier) => {
          const tierStyle = NET_WORTH_TIER_STYLES[tier];
          return (
            <li key={tier} className={styles.band} title={tierStyle.label}>
              <span className={styles.swatch} style={{ backgroundColor: tierStyle.hex }} />
              <span className={styles.bandLabel}>
                <span className="visually-hidden">{tierStyle.label}</span>
                <span aria-hidden="true">{tierStyle.shortLabel}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <span className={styles.end}>High</span>
    </div>
  );
}
