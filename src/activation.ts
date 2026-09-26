import {
  assertAttributes,
  assertEmptyElement,
  canonicalize,
  createMarkupSurfaceHostFacet,
  sameType,
  sealGraphFragment,
  textAttribute,
} from "@hypit/hypit/author-kit";
import type {
  BlobRef,
  ComponentPackage,
  FragmentOperation,
  ModuleManifest,
  StructuredElement,
  StructuredSurfaceHandler,
  SurfaceResolvedReference,
  TypeRef,
} from "@hypit/hypit/author-kit";
import { artifactTypes } from "@hypit/hypit/artifact";
import { compositionTypes } from "@hypit/hypit/composition";
import { spatialTypes } from "@hypit/hypit/spatial";
import type { CanvasSpace } from "@hypit/hypit/spatial";
import { temporalTypes } from "@hypit/hypit/temporal";
import type { TemporalWindow } from "@hypit/hypit/temporal";
import {
  createTemporalWindowProjection,
  resolveTemporalContext,
  temporalContextAttributeVocabulary,
  temporalWindowAttributeNames,
  temporalWindowAttributeVocabulary,
} from "@hypit/hypit/temporal-markup";
import { timelineTypes } from "@hypit/hypit/timeline";
import type { Timeline } from "@hypit/hypit/timeline";
import { renderMythicCanvasTrack } from "./render.js";
import type { Cue, Effect, Popup, PopupSpec, Scene, SceneSpec, TrackOptions, Word } from "./render.js";

const moduleRef = { name: "hypit-mythic-canvas-track", version: "1" } as const;
const typeNames = ["Options", "SceneSpec", "Scenes", "Cue", "Cues", "Effect", "Effects", "PopupSpec", "Popups"] as const;
const types = Object.fromEntries(typeNames.map((name) => [name, { module: moduleRef, name }])) as Record<(typeof typeNames)[number], TypeRef>;
const producerNames = ["empty-scenes", "append-scene", "empty-cues", "append-cue", "empty-effects", "append-effect", "empty-popups", "append-popup", "render"] as const;
const producers = Object.fromEntries(producerNames.map((name) => [name, { module: moduleRef, name }])) as Record<(typeof producerNames)[number], { module: typeof moduleRef; name: string }>;

export const manifest: ModuleManifest = {
  format: "hypit.module@1",
  ...moduleRef,
  dependencies: [artifactTypes.blob, compositionTypes.visualTrack, timelineTypes.track, spatialTypes.canvas, temporalTypes.window]
    .map((type) => ({ module: type.module })),
  types: Object.values(types).map((type) => ({ name: type.name })),
  capabilities: [],
  producers: [
    { name: producers["empty-scenes"].name, inputs: [], outputs: [{ name: "scenes", type: types.Scenes }], needs: [] },
    { name: producers["append-scene"].name, inputs: [{ name: "scenes", type: types.Scenes }, { name: "spec", type: types.SceneSpec }, { name: "image", type: artifactTypes.blob }], outputs: [{ name: "scenes", type: types.Scenes }], needs: [] },
    { name: producers["empty-cues"].name, inputs: [], outputs: [{ name: "cues", type: types.Cues }], needs: [] },
    { name: producers["append-cue"].name, inputs: [{ name: "cues", type: types.Cues }, { name: "cue", type: types.Cue }], outputs: [{ name: "cues", type: types.Cues }], needs: [] },
    { name: producers["empty-effects"].name, inputs: [], outputs: [{ name: "effects", type: types.Effects }], needs: [] },
    { name: producers["append-effect"].name, inputs: [{ name: "effects", type: types.Effects }, { name: "effect", type: types.Effect }], outputs: [{ name: "effects", type: types.Effects }], needs: [] },
    { name: producers["empty-popups"].name, inputs: [], outputs: [{ name: "popups", type: types.Popups }], needs: [] },
    { name: producers["append-popup"].name, inputs: [{ name: "popups", type: types.Popups }, { name: "spec", type: types.PopupSpec }, { name: "image", type: artifactTypes.blob }], outputs: [{ name: "popups", type: types.Popups }], needs: [] },
    { name: producers.render.name, inputs: [
      { name: "timeline", type: timelineTypes.track },
      { name: "canvas", type: spatialTypes.canvas },
      { name: "window", type: temporalTypes.window },
      { name: "options", type: types.Options },
      { name: "title", type: artifactTypes.blob },
      { name: "scenes", type: types.Scenes },
      { name: "cues", type: types.Cues },
      { name: "effects", type: types.Effects },
      { name: "popups", type: types.Popups },
    ], outputs: [{ name: "track", type: compositionTypes.visualTrack }], needs: [] },
  ],
};

const inline = <T>(record: { readonly value: { readonly kind: string; readonly value?: unknown } } | undefined, label: string): T => {
  if (record?.value.kind !== "inline") throw new Error(`${label} must be an inline value.`);
  return record.value.value as T;
};
const blob = (record: { readonly value: { readonly kind: string } } | undefined, label: string): BlobRef => {
  if (record?.value.kind !== "blob") throw new Error(`${label} must be a Blob Artifact.`);
  return record.value as BlobRef;
};
const value = (data: unknown) => ({ kind: "inline" as const, value: canonicalize(data) });

const component: ComponentPackage = {
  producers: [
    { producer: producers["empty-scenes"], handler: () => ({ outputs: { scenes: value([]) }, needs: {} }) },
    { producer: producers["append-scene"], handler: ({ inputs }) => ({ outputs: { scenes: value([
      ...inline<Scene[]>(inputs.scenes, "scenes"),
      { ...inline<SceneSpec>(inputs.spec, "scene spec"), image: blob(inputs.image, "scene image") },
    ]) }, needs: {} }) },
    { producer: producers["empty-cues"], handler: () => ({ outputs: { cues: value([]) }, needs: {} }) },
    { producer: producers["append-cue"], handler: ({ inputs }) => ({ outputs: { cues: value([
      ...inline<Cue[]>(inputs.cues, "cues"), inline<Cue>(inputs.cue, "cue"),
    ]) }, needs: {} }) },
    { producer: producers["empty-effects"], handler: () => ({ outputs: { effects: value([]) }, needs: {} }) },
    { producer: producers["append-effect"], handler: ({ inputs }) => ({ outputs: { effects: value([
      ...inline<Effect[]>(inputs.effects, "effects"), inline<Effect>(inputs.effect, "effect"),
    ]) }, needs: {} }) },
    { producer: producers["empty-popups"], handler: () => ({ outputs: { popups: value([]) }, needs: {} }) },
    { producer: producers["append-popup"], handler: ({ inputs }) => ({ outputs: { popups: value([
      ...inline<Popup[]>(inputs.popups, "popups"),
      { ...inline<PopupSpec>(inputs.spec, "popup spec"), image: blob(inputs.image, "popup image") },
    ]) }, needs: {} }) },
    { producer: producers.render, handler: ({ inputs }) => ({ outputs: { track: value(renderMythicCanvasTrack(
      inline<Timeline>(inputs.timeline, "timeline"),
      inline<CanvasSpace>(inputs.canvas, "canvas"),
      inline<TemporalWindow>(inputs.window, "window"),
      blob(inputs.title, "title"),
      inline<Scene[]>(inputs.scenes, "scenes"),
      inline<Cue[]>(inputs.cues, "cues"),
      inline<Effect[]>(inputs.effects, "effects"),
      inline<Popup[]>(inputs.popups, "popups"),
      inline<TrackOptions>(inputs.options, "options"),
    )) }, needs: {} }) },
  ],
};

const numberAttribute = (element: StructuredElement, name: string, fallback?: number): number => {
  const raw = element.attributes[name];
  if (raw === undefined && fallback !== undefined) return fallback;
  if (typeof raw !== "string" || raw.trim() === "" || !Number.isFinite(Number(raw))) throw new Error(`${element.name}.${name} must be a finite number.`);
  return Number(raw);
};

const reference = (element: StructuredElement, name: string, type: TypeRef, resolveReference: (path: string) => SurfaceResolvedReference | undefined): SurfaceResolvedReference => {
  const raw = element.attributes[name];
  if (typeof raw !== "object" || raw.kind !== "reference") throw new Error(`${element.name}.${name} must be a reference.`);
  const found = resolveReference(raw.path);
  if (found === undefined || !sameType(found.type, type)) throw new Error(`${element.name}.${name} has the wrong Type.`);
  return found;
};

export const decodeSurface: StructuredSurfaceHandler = ({ element, resolveReference }) => {
  assertAttributes(element, ["id", "timeline", "canvas", "title", "title-fade-start", "title-end", "badge-size", "subtitle-size", "badge-y", "subtitle-y", "transparent", ...temporalWindowAttributeNames]);
  const id = textAttribute(element, "id");
  const context = resolveTemporalContext({ element, resolveReference });
  const window = createTemporalWindowProjection({ id: `${id}.window`, subjectId: id, element, ...context, resolveReference });
  const canvas = reference(element, "canvas", spatialTypes.canvas, resolveReference);
  const title = reference(element, "title", artifactTypes.blob, resolveReference);
  const options: TrackOptions = {
    id,
    badgeSize: numberAttribute(element, "badge-size", 34),
    subtitleSize: numberAttribute(element, "subtitle-size", 56),
    badgeY: numberAttribute(element, "badge-y", 1450),
    subtitleY: numberAttribute(element, "subtitle-y", 1574),
    titleFadeStart: numberAttribute(element, "title-fade-start", 2.4),
    titleEnd: numberAttribute(element, "title-end", 3),
    transparent: textAttribute(element, "transparent", "false") === "true",
  };
  const records = [...window.records, { id: `${id}.options`, type: types.Options, value: value(options), range: element.range }];
  const components = [...window.components];
  const fragments = [...window.fragments];
  const inputs = [
    { name: "timeline", type: timelineTypes.track },
    { name: "canvas", type: spatialTypes.canvas },
    { name: "window", type: temporalTypes.window },
    { name: "options", type: types.Options },
    { name: "title", type: artifactTypes.blob },
  ];
  const bindings: Record<string, SurfaceResolvedReference["ref"]> = {
    timeline: context.timeline.ref,
    canvas: canvas.ref,
    window: window.ref,
    options: { kind: "record", id: `${id}.options` },
    title: title.ref,
  };
  const input = (name: string) => ({ kind: "fragment-input" as const, name });
  const operation = (name: string) => ({ kind: "fragment-operation" as const, operation: name });
  const operations: FragmentOperation[] = [
    { id: "empty-scenes", producer: producers["empty-scenes"], inputs: {}, result: { kind: "output", name: "scenes" } },
    { id: "empty-cues", producer: producers["empty-cues"], inputs: {}, result: { kind: "output", name: "cues" } },
    { id: "empty-effects", producer: producers["empty-effects"], inputs: {}, result: { kind: "output", name: "effects" } },
    { id: "empty-popups", producer: producers["empty-popups"], inputs: {}, result: { kind: "output", name: "popups" } },
  ];
  let previousScene = "empty-scenes", previousCue = "empty-cues", previousEffect = "empty-effects", previousPopup = "empty-popups";
  let sceneCount = 0, cueCount = 0, effectCount = 0, popupCount = 0;

  for (const child of element.children) {
    if (child.kind === "text") {
      if (child.value.trim()) throw new Error("Canvas Track accepts only Scene, Cue, Effect and Popup children.");
      continue;
    }
    const tag = child.name.split(":").at(-1);
    if (tag === "Scene") {
      assertAttributes(child, ["id", "image", "at", "start-zoom", "end-zoom", "start-y", "end-y"]); assertEmptyElement(child);
      const key = `scene-${++sceneCount}`;
      const spec: SceneSpec = { id: textAttribute(child, "id"), at: numberAttribute(child, "at"), startZoom: numberAttribute(child, "start-zoom"), endZoom: numberAttribute(child, "end-zoom"), startY: numberAttribute(child, "start-y", 0), endY: numberAttribute(child, "end-y", 0) };
      const image = reference(child, "image", artifactTypes.blob, resolveReference);
      records.push({ id: `${id}.${key}.spec`, type: types.SceneSpec, value: value(spec), range: child.range });
      inputs.push({ name: `${key}-spec`, type: types.SceneSpec }, { name: `${key}-image`, type: artifactTypes.blob });
      bindings[`${key}-spec`] = { kind: "record", id: `${id}.${key}.spec` }; bindings[`${key}-image`] = image.ref;
      operations.push({ id: key, producer: producers["append-scene"], inputs: { scenes: operation(previousScene), spec: input(`${key}-spec`), image: input(`${key}-image`) }, result: { kind: "output", name: "scenes" } });
      previousScene = key;
    } else if (tag === "Cue") {
      assertAttributes(child, ["id", "start", "end", "role", "text", "tone"]);
      const key = `cue-${++cueCount}`, tone = textAttribute(child, "tone");
      if (tone !== "blue" && tone !== "gold") throw new Error("Cue.tone must be blue or gold.");
      const start = numberAttribute(child, "start"), end = numberAttribute(child, "end");
      if (end <= start) throw new Error("Cue.end must be after Cue.start.");
      const words: Word[] = [];
      for (const part of child.children) {
        if (part.kind === "text") { if (part.value.trim()) throw new Error("Cue accepts only Word children."); continue; }
        if (part.name.split(":").at(-1) !== "Word") throw new Error("Cue accepts only Word children.");
        assertAttributes(part, ["text", "start", "end"]); assertEmptyElement(part);
        const word: Word = { text: textAttribute(part, "text"), start: numberAttribute(part, "start"), end: numberAttribute(part, "end") };
        if (word.end <= word.start || word.start < start || word.end > end) throw new Error("Word timing must be ordered and contained by its Cue.");
        if (words.length > 0 && word.start < words[words.length - 1]!.end) throw new Error("Word timings must not overlap.");
        words.push(word);
      }
      const text = textAttribute(child, "text");
      let textOffset = 0;
      for (const word of words) {
        const found = text.indexOf(word.text, textOffset);
        if (found === -1) throw new Error("Word text must occur in Cue.text in the declared order.");
        textOffset = found + word.text.length;
      }
      const cue: Cue = { id: textAttribute(child, "id"), start, end, role: textAttribute(child, "role", ""), text, tone, ...(words.length > 0 ? { words } : {}) };
      records.push({ id: `${id}.${key}`, type: types.Cue, value: value(cue), range: child.range });
      inputs.push({ name: key, type: types.Cue }); bindings[key] = { kind: "record", id: `${id}.${key}` };
      operations.push({ id: key, producer: producers["append-cue"], inputs: { cues: operation(previousCue), cue: input(key) }, result: { kind: "output", name: "cues" } }); previousCue = key;
    } else if (tag === "Effect") {
      assertAttributes(child, ["id", "amount", "min-size", "max-size", "color", "seed"]); assertEmptyElement(child);
      const key = `effect-${++effectCount}`;
      const effect: Effect = { id: textAttribute(child, "id"), amount: numberAttribute(child, "amount"), minSize: numberAttribute(child, "min-size"), maxSize: numberAttribute(child, "max-size"), color: textAttribute(child, "color"), seed: numberAttribute(child, "seed") };
      records.push({ id: `${id}.${key}`, type: types.Effect, value: value(effect), range: child.range });
      inputs.push({ name: key, type: types.Effect }); bindings[key] = { kind: "record", id: `${id}.${key}` };
      operations.push({ id: key, producer: producers["append-effect"], inputs: { effects: operation(previousEffect), effect: input(key) }, result: { kind: "output", name: "effects" } }); previousEffect = key;
    } else if (tag === "Popup") {
      assertAttributes(child, ["id", "image", "start", "end", "anchor", "offset-x", "offset-y", "x", "y", "width", "enter", "fade-out"]); assertEmptyElement(child);
      const key = `popup-${++popupCount}`;
      const start = numberAttribute(child, "start"), end = numberAttribute(child, "end");
      const width = numberAttribute(child, "width");
      const rawX = child.attributes.x, rawY = child.attributes.y, rawAnchor = child.attributes.anchor;
      const hasX = typeof rawX === "string", hasY = typeof rawY === "string", hasAnchor = typeof rawAnchor === "string";
      if (hasX !== hasY) throw new Error("Popup.x and Popup.y must be provided together.");
      if (hasX && hasAnchor) throw new Error("Popup uses either x/y or anchor, not both.");
      const offsetX = numberAttribute(child, "offset-x", 0), offsetY = numberAttribute(child, "offset-y", 0);
      if (!hasAnchor && (offsetX !== 0 || offsetY !== 0)) throw new Error("Popup.offset-x and Popup.offset-y require anchor.");
      const anchorPositions: Record<string, readonly [number, number]> = {
        "top-left": [0.18, 0.18], "top-center": [0.5, 0.18], "top-right": [0.82, 0.18],
        "center-left": [0.18, 0.5], "center": [0.5, 0.5], "center-right": [0.82, 0.5],
        "bottom-left": [0.18, 0.82], "bottom-center": [0.5, 0.82], "bottom-right": [0.82, 0.82],
      };
      const anchor = hasAnchor ? textAttribute(child, "anchor") : undefined;
      if (anchor !== undefined && !(anchor in anchorPositions)) throw new Error("Popup.anchor must be one of the nine grid positions.");
      const [anchorX, anchorY] = anchor === undefined ? [numberAttribute(child, "x"), numberAttribute(child, "y")] : anchorPositions[anchor]!;
      const x = anchorX + offsetX, y = anchorY + offsetY;
      const enter = numberAttribute(child, "enter", 0.2), fadeOut = numberAttribute(child, "fade-out", 0.3);
      if (end <= start) throw new Error("Popup.end must be after Popup.start.");
      if (x < 0 || x > 1 || y < 0 || y > 1) throw new Error("Popup position must stay within normalized values from 0 to 1.");
      if (width <= 0 || width > 1) throw new Error("Popup.width must be greater than 0 and no greater than 1.");
      if (enter < 0 || fadeOut < 0) throw new Error("Popup.enter and Popup.fade-out must be non-negative.");
      const spec: PopupSpec = { id: textAttribute(child, "id"), start, end, x, y, width, enter, fadeOut };
      const image = reference(child, "image", artifactTypes.blob, resolveReference);
      records.push({ id: `${id}.${key}.spec`, type: types.PopupSpec, value: value(spec), range: child.range });
      inputs.push({ name: `${key}-spec`, type: types.PopupSpec }, { name: `${key}-image`, type: artifactTypes.blob });
      bindings[`${key}-spec`] = { kind: "record", id: `${id}.${key}.spec` }; bindings[`${key}-image`] = image.ref;
      operations.push({ id: key, producer: producers["append-popup"], inputs: { popups: operation(previousPopup), spec: input(`${key}-spec`), image: input(`${key}-image`) }, result: { kind: "output", name: "popups" } });
      previousPopup = key;
    } else {
      throw new Error(`Canvas Track does not accept ${child.name}.`);
    }
  }
  if (sceneCount === 0 || cueCount === 0 || effectCount === 0) throw new Error("Canvas Track requires Scene, Cue and Effect children.");
  operations.push({ id: "render", producer: producers.render, inputs: { timeline: input("timeline"), canvas: input("canvas"), window: input("window"), options: input("options"), title: input("title"), scenes: operation(previousScene), cues: operation(previousCue), effects: operation(previousEffect), popups: operation(previousPopup) }, result: { kind: "output", name: "track" } });
  const fragment = sealGraphFragment({ inputs, operations, exports: [{ name: "track", type: compositionTypes.visualTrack, root: operation("render") }] });
  return { records, fragments: [...fragments, fragment], components: [...components, { id, fragment: fragment.id, inputs: bindings, outputs: { track: `${id}.track` }, range: element.range }], exports: [`${id}.track`] };
};

const declaration = {
  name: "track", tag: "Track", mode: "structured" as const,
  outputs: [compositionTypes.visualTrack, timelineTypes.track, spatialTypes.canvas, temporalTypes.instant,
    temporalTypes.window, temporalTypes.instantSpec, temporalTypes.windowSpec, artifactTypes.blob, ...Object.values(types)],
  vocabulary: {
    summary: "One deterministic Canvas/WebGL visual track for mythic scenes, particles and karaoke captions.",
    attributes: [
      ...temporalContextAttributeVocabulary, ...temporalWindowAttributeVocabulary,
      { name: "id", kind: "identifier" as const, required: true, summary: "Names this visual track." },
      { name: "canvas", kind: "reference" as const, required: true, accepts: [spatialTypes.canvas], summary: "The output canvas." },
      { name: "title", kind: "reference" as const, required: true, accepts: [artifactTypes.blob], summary: "Full-canvas transparent title overlay." },
      ...["title-fade-start", "title-end", "badge-size", "subtitle-size", "badge-y", "subtitle-y", "transparent"].map((name) => ({ name, kind: "literal" as const, required: false, summary: name })),
    ],
    children: [
      { tag: "Scene", cardinality: "many" as const, summary: "A scene image and deterministic Ken Burns motion.", attributes: [
        { name: "id", kind: "identifier" as const, required: true, summary: "Scene id." },
        { name: "image", kind: "reference" as const, required: true, accepts: [artifactTypes.blob], summary: "Scene image." },
        ...["at", "start-zoom", "end-zoom", "start-y", "end-y"].map((name) => ({ name, kind: "literal" as const, required: name !== "start-y" && name !== "end-y", summary: name })),
      ] },
      { tag: "Cue", cardinality: "many" as const, summary: "One caption cue, optionally with word-level Wipe timing.", attributes: [
        { name: "id", kind: "identifier" as const, required: true, summary: "Cue id." },
        ...["start", "end", "text", "tone"].map((name) => ({ name, kind: "literal" as const, required: true, summary: name })),
        { name: "role", kind: "literal" as const, required: false, summary: "Optional speaker badge text." },
      ], children: [{ tag: "Word", cardinality: "many" as const, summary: "One ordered word or character timing span for word-level Wipe.", attributes: [
        ...["text", "start", "end"].map((name) => ({ name, kind: "literal" as const, required: true, summary: name })),
      ] }] },
      { tag: "Effect", cardinality: "many" as const, summary: "One deterministic WebGL bokeh or dust layer.", attributes: [
        { name: "id", kind: "identifier" as const, required: true, summary: "Effect id." },
        ...["amount", "min-size", "max-size", "color", "seed"].map((name) => ({ name, kind: "literal" as const, required: true, summary: name })),
      ] },
      { tag: "Popup", cardinality: "many" as const, summary: "A timed transparent image with spring entrance and fade-out.", attributes: [
        { name: "id", kind: "identifier" as const, required: true, summary: "Popup id." },
        { name: "image", kind: "reference" as const, required: true, accepts: [artifactTypes.blob], summary: "Transparent popup image." },
        ...["start", "end", "width"].map((name) => ({ name, kind: "literal" as const, required: true, summary: name })),
        { name: "anchor", kind: "literal" as const, required: false, summary: "One of the nine grid positions; use instead of x/y." },
        ...["offset-x", "offset-y", "x", "y"].map((name) => ({ name, kind: "literal" as const, required: false, summary: name })),
        ...["enter", "fade-out"].map((name) => ({ name, kind: "literal" as const, required: false, summary: name })),
      ] },
    ],
    ports: [{ name: "track", type: compositionTypes.visualTrack, summary: "The complete visual contribution." }],
    example: '<mythic:Track id="visual" timeline={program.timeline} canvas={canvas} title={title} during="program"><mythic:Scene id="one" image={img01} at="0" start-zoom="1.08" end-zoom="1.0"/><mythic:Cue id="one" start="0.3" end="1.0" role="【 Narrator 】" text="Light rises" tone="blue"><mythic:Word text="Light " start="0.3" end="0.6"/><mythic:Word text="rises" start="0.6" end="1.0"/></mythic:Cue><mythic:Effect id="gold" amount="0.2" min-size="60" max-size="140" color="#FFD98A" seed="22"/></mythic:Track>',
  },
};

export const hypitPackage = {
  format: "hypit.node-package@1" as const,
  modules: [{ manifest }],
  components: [component],
  hostFacets: [createMarkupSurfaceHostFacet({ module: moduleRef, declaration, handler: decodeSurface })],
};
export default hypitPackage;
