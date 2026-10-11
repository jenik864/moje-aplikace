import type { Muscle } from "./catalog.ts";
export type MusclePart = { muscle: Muscle; paths: string[]; fibers?: string[] };
// Left-side contours are mirrored; separate bellies preserve anatomical landmarks.
export const frontParts: MusclePart[] = [
  {
    muscle: "shoulders",
    paths: ["M83 88 C69 85 60 96 61 112 Q64 126 76 129 Q88 117 88 101 Z"],
    fibers: ["M80 92Q65 103 67 120", "M84 98Q74 109 73 124"],
  },
  {
    muscle: "chest",
    paths: [
      "M90 96 Q102 93 117 98 L118 131 Q110 146 88 145 Q80 137 79 124 Q85 110 90 96Z",
    ],
    fibers: [
      "M91 105Q102 107 115 102",
      "M85 117Q101 122 115 111",
      "M85 132Q104 137 115 123",
    ],
  },
  {
    muscle: "biceps",
    paths: [
      "M66 131 Q73 133 75 141 Q75 164 61 180 Q56 173 57 159 Q58 142 66 131Z",
    ],
    fibers: ["M67 139Q69 157 62 173"],
  },
  {
    muscle: "triceps",
    paths: ["M61 128Q56 139 53 160 L53 174 Q55 178 58 176 Q55 153 63 137Z"],
  },
  {
    muscle: "core",
    paths: [
      "M110 150Q116 148 118 154 L118 169 Q113 173 106 169 L105 155Z",
      "M106 174Q113 174 118 177 L118 191 Q111 195 104 189 L103 179Z",
      "M103 195Q112 196 118 198 L118 212 Q109 216 101 207Z",
      "M101 215Q110 218 118 217 L118 238 Q108 235 102 224Z",
      "M87 151L102 160L100 179Q91 171 87 151Z",
      "M87 173L99 184L97 202Q89 194 87 173Z",
      "M89 197L97 211L100 232Q91 219 89 197Z",
    ],
    fibers: ["M92 158L98 170", "M92 180L96 194", "M93 205L97 221"],
  },
  {
    muscle: "glutes",
    paths: ["M89 235Q84 248 83 261 L89 272 Q94 252 101 244Z"],
  },
  {
    muscle: "quads",
    paths: [
      "M92 261 Q104 257 110 270 Q113 295 102 344 Q96 354 90 341 Q86 316 87 285Z",
      "M84 270Q79 287 79 311 Q79 343 85 362 Q91 365 94 355 Q86 329 87 295Z",
      "M104 327 Q113 338 112 355 Q111 365 101 368 Q95 363 96 353Z",
    ],
    fibers: [
      "M98 271Q101 302 96 331",
      "M83 289Q80 323 88 352",
      "M106 338L103 359",
    ],
  },
  { muscle: "hamstrings", paths: ["M112 267L115 277L109 321L104 329Z"] },
  {
    muscle: "calves",
    paths: ["M88 389 Q99 380 104 392 Q106 416 98 447 L91 469 Q85 459 86 435Z"],
    fibers: ["M97 395Q101 419 92 451"],
  },
];
export const backParts: MusclePart[] = [
  {
    muscle: "back",
    paths: [
      "M108 71Q101 86 83 91L91 112L117 144L118 95Z",
      "M88 119Q97 130 116 147 L116 218Q103 204 94 180Q88 152 88 119Z",
      "M109 187L116 198L117 240L107 237L103 219Z",
    ],
    fibers: [
      "M108 82L98 94",
      "M105 99L114 123",
      "M96 137Q104 157 111 170",
      "M95 153Q99 174 111 191",
      "M110 205L112 230",
    ],
  },
  {
    muscle: "shoulders",
    paths: ["M84 91Q66 85 61 102Q58 116 69 127L80 126L91 111Z"],
    fibers: ["M79 96Q65 104 68 118"],
  },
  {
    muscle: "triceps",
    paths: [
      "M67 131Q75 133 73 148L64 178Q56 181 56 167Q55 146 67 131Z",
      "M60 134Q53 143 52 159L53 178L58 181Q55 157 63 144Z",
    ],
    fibers: ["M67 141L62 168"],
  },
  {
    muscle: "glutes",
    paths: ["M94 236Q101 237 117 244L117 269Q103 287 88 272 Q80 256 94 236Z"],
    fibers: ["M97 243Q98 257 113 267", "M89 253Q93 265 104 273"],
  },
  {
    muscle: "hamstrings",
    paths: [
      "M90 279Q99 280 106 278Q112 301 102 343L97 366Q88 364 85 350Q82 321 90 279Z",
      "M107 281L115 279Q117 310 107 349L101 367L99 363Q109 322 107 281Z",
    ],
    fibers: ["M96 290Q94 319 92 346", "M111 291Q113 311 103 346"],
  },
  {
    muscle: "calves",
    paths: [
      "M91 385Q99 379 103 390Q109 409 99 431Q91 428 88 414Q85 399 91 385Z",
      "M86 390Q79 398 80 415Q81 431 90 440L95 432Q85 412 86 390Z",
    ],
    fibers: ["M97 391Q102 410 97 423", "M83 403Q83 421 89 433"],
  },
];
export const muscleNotes: Record<Muscle, string> = {
  chest: "Prsní svaly přibližují paži k tělu a pomáhají při tlaku před sebe.",
  shoulders: "Deltové svaly zvedají paži a podílejí se na jejím vedení.",
  biceps: "Biceps ohýbá loket a pomáhá otáčet předloktí dlaní vzhůru.",
  triceps: "Triceps propíná loket, například při tlacích.",
  core: "Přímý břišní sval, šikmé břišní svaly a hlubší svaly trupu pomáhají stabilizovat tělo.",
  back: "Záda zahrnují široký sval zádový, trapézy a další svaly pro tah a stabilitu trupu.",
  glutes: "Hýžďové svaly pomáhají propínat kyčel a stabilizovat pánev.",
  quads: "Čtyřhlavý sval stehenní propíná koleno.",
  hamstrings: "Zadní stehenní svaly ohýbají koleno a pomáhají propínat kyčel.",
  calves: "Lýtkové svaly zvedají patu a pomáhají při odrazu.",
};
export function roleFor(
  muscle: Muscle,
  exercise: { main: Muscle[]; secondary: Muscle[] },
) {
  return exercise.main.includes(muscle)
    ? "main"
    : exercise.secondary.includes(muscle)
      ? "secondary"
      : "other";
}
export function preferBack(exercise: { main: Muscle[] }) {
  return (
    !exercise.main.some((m) => m === "quads" || m === "chest") &&
    exercise.main.some((m) =>
      ["back", "hamstrings", "glutes", "calves", "triceps"].includes(m),
    )
  );
}
