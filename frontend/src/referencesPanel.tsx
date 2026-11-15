import { REFERENCES } from "./references";

export function ReferencesPanel() {
  return (
    <section className="references-panel">
      <div className="section-heading">
        <div><p className="eyebrow">04 / REFERENCES</p><h2>Scientific literature</h2></div>
        <span className="source-chip">DOI links</span>
      </div>
      <p className="references-note">
        References provide context and research pathways. They do not validate the current parcel observations.
      </p>
      <ul className="reference-list">
        {REFERENCES.map((reference) => (
          <li key={reference.id}>
            <a href={reference.doi} target="_blank" rel="noreferrer">
              <strong>{reference.id}</strong> {reference.shortCitation}
            </a>
            <p>{reference.relevance}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
