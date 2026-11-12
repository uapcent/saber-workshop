import { productUrl } from '../data/catalog';
import { MODELS } from '../data/models';
import { eur, finishOf, type PartRow, type Totals } from '../lib/saber';
import type { Saber } from '../types';
import { StatusPill, StoreTags, Swatch } from './PartPickers';

function StoreLink({ id, children }: { id: number; children: string }) {
  return (
    <>
      {' '}
      <a href={productUrl(id)} target="_blank" rel="noopener">
        {children}
      </a>
    </>
  );
}

function Row({ row }: { row: PartRow }) {
  const blocked = unavailable(row) !== null;
  const { status: st, quantity: q } = row;
  const finish = finishOf(row.choice.finish);
  let price: React.ReactNode = '–';
  let link: React.ReactNode = null;
  if (st.kind === 'store') {
    price = (
      <>
        {st.was !== undefined && (
          <span className={'was ' + (st.price < st.was ? 'down' : 'up')} title={`Catalog price ${eur(st.was)}`}>
            {st.price < st.was ? '▼' : '▲'}{' '}
          </span>
        )}
        {eur(st.price * q)}
      </>
    );
    link = <StoreLink id={st.id}>view</StoreLink>;
  } else if (st.kind === 'coat' && st.base) {
    price = <span className="small">base {eur(st.base.price * q)}</span>;
    link = <StoreLink id={st.base.id}>base part</StoreLink>;
  }
  return (
    <tr className={blocked ? 'row-unavailable' : undefined}>
      <td>
        {MODELS[row.kind][row.choice.model].name}
        {q > 1 && <b className="qty"> ×{q}</b>}
        <div className="small">{row.label}</div>
      </td>
      <td>
        <Swatch color={finish.color} /> {finish.name}
      </td>
      <td>
        <StatusPill status={st} />
        <StoreTags status={st} />
        {link}
      </td>
      <td className="num">{price}</td>
    </tr>
  );
}

/** Why a part can't be bought from the store right now, or null if it can. */
function unavailable(row: PartRow): string | null {
  const st = row.status;
  const name = MODELS[row.kind][row.choice.model].name;
  if (st.kind === 'legacy') return `${name}: discontinued, no longer sold.`;
  if (st.kind === 'store') {
    if (st.listed === false) return `${name} in ${finishOf(row.choice.finish).name}: no longer listed in the store.`;
    if (!st.inStock) return `${name} in ${finishOf(row.choice.finish).name}: out of stock.`;
    return null;
  }
  if (!st.base) return `${name}: not sold in this finish, and there is no aluminum base to coat.`;
  if (st.base.listed === false) return `${name}: the aluminum base to coat is no longer listed in the store.`;
  if (!st.base.inStock) return `${name}: the aluminum base to coat is out of stock.`;
  return null;
}

export function PartsList({ saber, totals: t }: { saber: Saber; totals: Totals }) {
  const problems = [...new Set(t.rows.map(unavailable).filter((p): p is string => !!p))];
  return (
    <section className="list">
      <h2>Shopping list · {saber.name || 'Untitled'}</h2>
      {problems.length > 0 && (
        <div className="unavailable" role="note">
          <b>
            {problems.length === 1 ? 'One part' : `${problems.length} parts`} of this saber can't be bought right now:
          </b>
          <ul>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Part</th>
            <th>Finish</th>
            <th>Status</th>
            <th className="num">Price</th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map((row, i) => (
            <Row key={i} row={row} />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Store parts</td>
            <td className="num">{eur(t.store)}</td>
          </tr>
          {t.toCoat > 0 && (
            <tr>
              <td colSpan={3}>Aluminum bases to coat ({t.toCoat}), coating cost not included</td>
              <td className="num">{eur(t.bases)}</td>
            </tr>
          )}
        </tfoot>
      </table>
      <p className="small footnote">
        Not included: Anima core (LED, speaker, battery, USB switch), lens, blade{saber.style === 'staff' ? 's' : ''}, screws, weight disk and
        weights.
      </p>
    </section>
  );
}
