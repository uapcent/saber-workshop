import { productUrl } from '../data/catalog';
import { MODELS } from '../data/models';
import { eur, finishOf, type PartRow, type Totals } from '../lib/saber';
import type { Saber } from '../types';
import { StatusPill, Swatch } from './PartPickers';

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
  const { status: st, quantity: q } = row;
  const finish = finishOf(row.choice.finish);
  let price: React.ReactNode = '–';
  let link: React.ReactNode = null;
  if (st.kind === 'store') {
    price = eur(st.price * q);
    link = <StoreLink id={st.id}>view</StoreLink>;
  } else if (st.kind === 'coat' && st.base) {
    price = <span className="small">base {eur(st.base.price * q)}</span>;
    link = <StoreLink id={st.base.id}>base part</StoreLink>;
  }
  return (
    <tr>
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
        {link}
      </td>
      <td className="num">{price}</td>
    </tr>
  );
}

export function PartsList({ saber, totals: t }: { saber: Saber; totals: Totals }) {
  return (
    <section className="list">
      <h2>Shopping list · {saber.name || 'Untitled'}</h2>
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
