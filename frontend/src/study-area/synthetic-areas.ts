export interface StudyArea {
  readonly id: string;
  readonly name: string;
  readonly type: "Study area" | "Parcel";
  readonly area: string;
  readonly path: string;
  readonly center: readonly [number, number];
}

// Schematic SVG shapes for interaction design only. These are not georeferenced.
export const SYNTHETIC_AREAS: readonly StudyArea[] = [
  {
    id: "haouz-west",
    name: "Western survey block",
    type: "Study area",
    area: "18.4 km²",
    path: "M92 139 L173 105 L223 134 L208 203 L133 220 L86 184 Z",
    center: [151, 162],
  },
  {
    id: "parcel-01",
    name: "Synthetic parcel 01",
    type: "Parcel",
    area: "2.6 ha",
    path: "M278 104 L347 119 L334 174 L267 162 Z",
    center: [307, 139],
  },
  {
    id: "parcel-02",
    name: "Synthetic parcel 02",
    type: "Parcel",
    area: "1.8 ha",
    path: "M382 170 L453 158 L473 216 L408 236 Z",
    center: [422, 197],
  },
  {
    id: "parcel-03",
    name: "Synthetic parcel 03",
    type: "Parcel",
    area: "3.1 ha",
    path: "M206 259 L278 239 L300 297 L231 316 Z",
    center: [252, 277],
  },
];
