import { LAYOUT_NAMES, type LayoutName } from '@/lib/layouts/layouts';
import styles from './LayoutControls.module.css';

const LAYOUT_LABELS: Record<LayoutName, string> = {
  table: 'Table',
  sphere: 'Sphere',
  helix: 'Helix',
  grid: 'Grid',
};

interface LayoutControlsProps {
  value: LayoutName;
  onChange: (layout: LayoutName) => void;
}

export function LayoutControls({ value, onChange }: LayoutControlsProps) {
  return (
    <nav className={styles.controls} aria-label="Arrangement">
      {LAYOUT_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          className={styles.button}
          aria-pressed={value === name}
          onClick={() => onChange(name)}
        >
          {LAYOUT_LABELS[name]}
        </button>
      ))}
    </nav>
  );
}
