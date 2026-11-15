import { interpret } from "./interpretation";
import type { ObservationResponse } from "./types";
import { REFERENCES } from "./references";

type Props = { response: ObservationResponse | null };

export function InterpretationPanel({ response }: Props) {
  if (!response) return null;
  const result = interpret(response);
  const referenceMap = new Map(REFERENCES.map((reference) => [reference.id, reference]));
  return (
    <section className="interpretation-panel">
      <div className="section-heading">
        <div><p className="eyebrow">03 / INTERPRETATION</p><h2>Deterministic reading</h2></div>
        <span className="contract-chip">Rules only</span>
      </div>
      <div className="interpretation-level">
        <h3>Level 1 — Direct observations</h3>
        <ul>
          {result.directObservations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div className="interpretation-level">
        <h3>Level 2 — Literature-supported context</h3>
        <ul>
          {result.contextual.map((item) => (
            <li key={item.text}>
              {item.text}
              {item.refs && item.refs.length > 0 && (
                <span className="ref-inline">
                  {" "}
                  {item.refs.map((ref) => (
                    <a key={ref} href={referenceMap.get(ref)?.doi} target="_blank" rel="noreferrer">
                      {ref}
                    </a>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="interpretation-level">
        <h3>Level 3 — Limitations</h3>
        <ul>
          {result.limitations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </section>
  );
}
