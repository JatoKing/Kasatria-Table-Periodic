import { formatCurrency, getNetWorthTier, NET_WORTH_TIER_STYLES } from '@/lib/people/net-worth';
import type { Person } from '@/lib/people/types';

/**
 * Builds the DOM element for one person (Image B layout):
 * country top-left, age top-right, photo, name and interest, coloured by net worth.
 *
 * Sheet values are written with textContent, never innerHTML, so cell content cannot inject markup.
 */
export function createPersonTile(person: Person): HTMLElement {
  const tier = getNetWorthTier(person.netWorth);

  const tile = document.createElement('div');
  tile.className = 'person-tile';
  tile.dataset.tier = tier;
  tile.style.setProperty('--tile-rgb', NET_WORTH_TIER_STYLES[tier].rgb);
  tile.title = describePerson(person);

  const meta = createElement('div', 'person-tile__meta');
  meta.append(
    createElement('span', 'person-tile__country', person.country),
    createElement('span', 'person-tile__age', person.age === null ? '' : String(person.age)),
  );

  tile.append(
    meta,
    createPhoto(person),
    createElement('div', 'person-tile__name', person.name),
    createElement('div', 'person-tile__interest', person.interest),
  );

  return tile;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function createPhoto(person: Person): HTMLElement {
  const fallback = createElement(
    'div',
    'person-tile__photo person-tile__photo--fallback',
    getInitials(person.name),
  );
  if (!person.photoUrl) return fallback;

  const image = document.createElement('img');
  image.className = 'person-tile__photo';
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => image.replaceWith(fallback), { once: true });
  image.src = person.photoUrl;
  return image;
}

function createElement(tag: 'div' | 'span', className: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function describePerson(person: Person): string {
  const details = [person.name];
  if (person.age !== null) details.push(`Age: ${person.age}`);
  details.push(
    `Country: ${person.country}`,
    `Interest: ${person.interest}`,
    `Net worth: ${formatCurrency(person.netWorth)}`,
  );
  return details.join('\n');
}
