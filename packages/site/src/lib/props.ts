// Build-time props extraction for the per-component Props tables.
//
// Reads @ps1ui/core's *source* types through the TypeScript 7 API
// (`typescript/unstable/sync` — the same tsgo the repo's `tsc` runs, so the
// analysis can never disagree with the typecheck) and turns each component's
// `<Name>Props` alias into table-ready data:
//
//   - "own" props — properties declared in core's own source. Native
//     passthrough props (`ComponentProps<"tag">`, hundreds of DOM attrs) are
//     deliberately NOT expanded; they are summarized as passthrough entries.
//   - passthrough entries — derived from the alias declaration's AST: either
//     a fixed native tag (`ComponentProps<"div">`, minus `Omit`-ted keys) or
//     a polymorphic target (`ComponentPropsWithoutRef<E>` + the `as` prop).
//
// Everything here fails LOUDLY. A component whose Props alias doesn't match a
// shape this module understands must extend this module, not silently render
// an empty table — same contract as core's `check:*` scripts. Two structural
// invariants back that up (see `componentPropsDoc`): every extracted own prop
// must be destructured by the component implementation, and every destructured
// key must be an own prop, a universally merged key (className/style/children/
// ref), or a real native prop of a fixed-tag passthrough target.
//
// The API spawns one long-lived tsgo process per build (module-level
// singleton); every page shares it. In `astro dev` the extraction runs once
// per server process — like core `dist/` changes, edits to core's prop types
// need a dev-server restart to show up.

import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  isFunctionDeclaration,
  isIdentifier,
  isIntersectionTypeNode,
  isLiteralTypeNode,
  isObjectBindingPattern,
  isParenthesizedTypeNode,
  isPropertySignatureDeclaration,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeParameterDeclaration,
  isTypeReferenceNode,
  isUnionTypeNode,
  isVariableStatement,
  SyntaxKind,
  type Block,
  type EntityName,
  type Node,
  type PropertySignatureDeclaration,
  type SourceFile,
  type TypeAliasDeclaration,
  type TypeNode,
  type TypeParameterDeclaration,
  type TypeReferenceNode,
  type UnionTypeNode,
} from "typescript/unstable/ast";
import {
  API,
  SymbolFlags,
  type Checker,
  type Project,
  type Symbol as TsSymbol,
  type Type,
} from "typescript/unstable/sync";
import { registerPropsExtractionClose } from "./props-close.ts";

export type PropDoc = {
  name: string;
  /**
   * Display type: the declared type text, simplified for readers — small
   * local literal-union aliases expand to their members, `Responsive<T>`
   * reduces to `T`, and `X | (string & {})` autocomplete unions reduce to
   * `string` (repo-internal type names never reach the table).
   */
  type: string;
  required: boolean;
  /** Source-text default from the implementation's destructuring (or the `as` type-param default). */
  defaultValue: string | undefined;
  /** JSDoc comment on the prop declaration. */
  description: string;
};

export type PassthroughDoc =
  | { kind: "tag"; tag: string; omitted: string[] }
  | { kind: "polymorphic"; viaProp: string; defaultTag: string | undefined; refExcluded: boolean };

export type ComponentPropsDoc = {
  component: string;
  props: PropDoc[];
  passthrough: PassthroughDoc[];
};

// Expand a local literal-union alias (ButtonVariant, SpaceScale, ...) into its
// members only when it stays scannable; big unions (CodeBlockLanguage) keep
// their alias name.
const EXPAND_MEMBER_CAP = 12;

// Keys ANY wrapper may destructure without them being own props: className is
// re-merged via cx(), style via the caller-style/vars merge, children are
// re-slotted, and `ref` is merged into an internal ref. Every other
// destructured key must be an own prop or a real native prop of one of the
// component's fixed-tag passthrough targets (see nativePassthroughKeys) —
// no per-component exemptions here, so the list can't hollow out over time.
const UNIVERSAL_DESTRUCTURED_KEYS = new Set(["className", "style", "children", "ref"]);

type Ctx = {
  api: API;
  project: Project;
  checker: Checker;
  /**
   * Real path of packages/core, forward-slash-normalized and lowercased for
   * comparisons against tsgo paths — the API always reports forward-slash
   * form (even on Windows) and canonicalizes case on case-insensitive
   * filesystems.
   */
  coreDirLower: string;
  /** Real path of packages/core (original case), for building file names. */
  coreDir: string;
  docCache: Map<string, ComponentPropsDoc>;
};

let ctxSingleton: Ctx | undefined;

/** Shut the tsgo child down and drop all cached extraction state. */
function closeExtraction(): void {
  const current = ctxSingleton;
  ctxSingleton = undefined;
  if (!current) return;
  try {
    current.api.close();
  } catch {
    // already gone — nothing to clean up
  }
}

// The astro.config integration closes the API when the build (or dev server)
// finishes — that's the clean path; closing only during the abrupt `exit`
// phase makes the tsgo server log a spurious "context canceled" into the
// build output. The config module runs in a different module graph than this
// Vite-SSR module, so the hook is bridged via globalThis (props-close.ts) —
// registration also closes any tsgo child left by a previous incarnation of
// this module after a Vite SSR reload, and wires once-per-process exit
// fallbacks for plain-Node usage.
registerPropsExtractionClose(closeExtraction);

function getCtx(): Ctx {
  if (ctxSingleton) return ctxSingleton;
  const require = createRequire(import.meta.url);
  const coreDir = realpathSync(path.dirname(require.resolve("@ps1ui/core/package.json")));
  const api = new API({ cwd: coreDir });
  const tsconfig = path.join(coreDir, "tsconfig.json");
  const snapshot = api.updateSnapshot({ openProjects: [tsconfig] });
  const project = snapshot
    .getProjects()
    .find((p) => realpathSync(p.configFileName).toLowerCase() === tsconfig.toLowerCase());
  if (!project) {
    throw new Error(`props extraction: tsgo did not load ${tsconfig}`);
  }
  ctxSingleton = {
    api,
    project,
    checker: project.checker,
    coreDir,
    coreDirLower: coreDir.replaceAll("\\", "/").toLowerCase(),
    docCache: new Map(),
  };
  return ctxSingleton;
}

function inCoreSrc(ctx: Ctx, filePath: string): boolean {
  return filePath.replaceAll("\\", "/").toLowerCase().startsWith(`${ctx.coreDirLower}/src/`);
}

function fail(component: string, message: string): never {
  throw new Error(
    `props extraction (${component}): ${message} — if the component's Props shape is new, extend src/lib/props.ts to classify it`,
  );
}

// ---------------------------------------------------------------------------
// Symbol / AST resolution helpers

function entityNameIdentifier(name: EntityName): Node {
  // For qualified names (React.ComponentProps) resolve the rightmost part.
  return isIdentifier(name) ? name : name.right;
}

function entityNameText(name: EntityName): string {
  return entityNameIdentifier(name).getText();
}

/** Resolve a type reference name to its symbol, following import aliases. */
function resolveTypeSymbol(ctx: Ctx, name: EntityName): TsSymbol | undefined {
  let symbol = ctx.checker.getSymbolAtLocation(entityNameIdentifier(name));
  if (symbol && symbol.flags & SymbolFlags.Alias) {
    const aliased = ctx.checker.getAliasedSymbol(symbol);
    if (!ctx.checker.isUnknownSymbol(aliased)) symbol = aliased;
  }
  return symbol;
}

/** Resolve a type reference to a type-alias declaration inside core's src, if that's what it names. */
function resolveLocalTypeAlias(ctx: Ctx, name: EntityName): TypeAliasDeclaration | undefined {
  const symbol = resolveTypeSymbol(ctx, name);
  for (const handle of symbol?.declarations ?? []) {
    if (!inCoreSrc(ctx, handle.path)) continue;
    const node = handle.resolve(ctx.project);
    if (node && isTypeAliasDeclaration(node)) return node;
  }
  return undefined;
}

/** Resolve a type reference to a type-parameter declaration (the `E` in `ButtonProps<E>`), if any. */
function resolveTypeParameter(ctx: Ctx, name: EntityName): TypeParameterDeclaration | undefined {
  const symbol = resolveTypeSymbol(ctx, name);
  for (const handle of symbol?.declarations ?? []) {
    const node = handle.resolve(ctx.project);
    if (node && isTypeParameterDeclaration(node)) return node;
  }
  return undefined;
}

/** True when the reference resolves into @types/react (ComponentProps & friends). */
function resolvesToReactTypes(ctx: Ctx, name: EntityName): boolean {
  const symbol = resolveTypeSymbol(ctx, name);
  return (symbol?.declarations ?? []).some((d) => d.path.includes("@types/react"));
}

// ---------------------------------------------------------------------------
// Own props

type OwnProp = {
  name: string;
  symbols: TsSymbol[];
  optional: boolean;
  /** PropertySignature declarations in core src, sorted by source position. */
  declarations: PropertySignatureDeclaration[];
};

function collectOwnProps(ctx: Ctx, component: string, aliasType: Type): OwnProp[] {
  const branches = aliasType.isUnionType() ? aliasType.getTypes() : [aliasType];
  const merged = new Map<string, { symbols: TsSymbol[]; branchesPresent: number }>();
  for (const branch of branches) {
    for (const symbol of ctx.checker.getPropertiesOfType(branch)) {
      const own = (symbol.declarations ?? []).some((d) => inCoreSrc(ctx, d.path));
      if (!own) continue;
      const entry = merged.get(symbol.name) ?? { symbols: [], branchesPresent: 0 };
      entry.symbols.push(symbol);
      entry.branchesPresent += 1;
      merged.set(symbol.name, entry);
    }
  }
  const props: OwnProp[] = [];
  for (const [name, entry] of merged) {
    const declarations = entry.symbols
      .flatMap((s) => s.declarations ?? [])
      .filter((d) => inCoreSrc(ctx, d.path))
      .map((d) => d.resolve(ctx.project))
      .filter((n): n is Node => n !== undefined)
      .filter(isPropertySignatureDeclaration)
      .sort((a, b) => a.pos - b.pos);
    if (declarations.length === 0) {
      fail(component, `own prop "${name}" has no resolvable PropertySignature declaration`);
    }
    const optional =
      entry.branchesPresent < branches.length ||
      entry.symbols.some((s) => !!(s.flags & SymbolFlags.Optional));
    props.push({ name, symbols: entry.symbols, optional, declarations });
  }
  return props.sort((a, b) => (a.declarations[0]?.pos ?? 0) - (b.declarations[0]?.pos ?? 0));
}

// ---------------------------------------------------------------------------
// Display type rendering

/**
 * Render a declared type node for display. Local aliases that are small
 * literal unions expand to their members ("primary" | "secondary"); type
 * parameters render as their constraint (`as?: E` → the accepted tags);
 * `Responsive<T>` reduces to its payload `T` (the responsive modality is a
 * docs-page concern, not a per-row type concern); unions carrying a
 * plain-string member (the `X | (string & {})` autocomplete idiom) reduce to
 * `string` plus any informative literal members; everything else keeps its
 * source text.
 */
function renderTypeNode(ctx: Ctx, node: TypeNode): string {
  if (isParenthesizedTypeNode(node)) {
    return `(${renderTypeNode(ctx, node.type)})`;
  }
  if (isUnionTypeNode(node)) {
    return renderUnionTypeNode(ctx, node);
  }
  if (isTypeReferenceNode(node)) {
    const name = entityNameText(node.typeName);
    const localAlias = resolveLocalTypeAlias(ctx, node.typeName);
    if (localAlias) {
      const args = node.typeArguments;
      if (
        name === "Responsive" &&
        localAlias.getSourceFile().fileName.endsWith("/utils/responsive.ts") &&
        args?.[0]
      ) {
        return renderTypeNode(ctx, args[0]);
      }
      if (args && args.length > 0) {
        return `${name}<${args.map((a) => renderTypeNode(ctx, a)).join(", ")}>`;
      }
      return literalUnionExpansion(ctx, localAlias, new Set()) ?? name;
    }
    const typeParam = resolveTypeParameter(ctx, node.typeName);
    if (typeParam?.constraint) {
      return renderTypeNode(ctx, typeParam.constraint);
    }
    return node.getText();
  }
  return node.getText();
}

/**
 * Union rendering with the `X | (string & {})` reduction: a member `string`
 * is assignable TO (i.e. one that accepts every string — `string` itself or
 * the `string & {}` idiom) makes literal members redundant *type-wise*, but
 * literal members still carry "suggested values" information — so they stay,
 * while unexpandable alias members subsumed by `string` (CodeBlockLanguage)
 * are dropped: their name alone tells a docs reader nothing.
 */
function renderUnionTypeNode(ctx: Ctx, node: UnionTypeNode): string {
  const stringType = ctx.checker.getStringType();
  const acceptsAnyString = (member: TypeNode): boolean => {
    const type = ctx.checker.getTypeFromTypeNode(member);
    return !!type && !type.isErrorType() && ctx.checker.isTypeAssignableTo(stringType, type);
  };
  if (!node.types.some(acceptsAnyString)) {
    return node.types.map((t) => renderTypeNode(ctx, t)).join(" | ");
  }
  const parts: string[] = [];
  for (const member of node.types) {
    if (acceptsAnyString(member)) continue; // folded into the trailing "string"
    const rendered = renderTypeNode(ctx, member);
    const memberType = ctx.checker.getTypeFromTypeNode(member);
    const isBareAliasName = /^[A-Za-z_$][\w$]*$/.test(rendered);
    if (
      isBareAliasName &&
      memberType &&
      !memberType.isErrorType() &&
      ctx.checker.isTypeAssignableTo(memberType, stringType)
    ) {
      continue;
    }
    parts.push(rendered);
  }
  parts.push("string");
  return parts.join(" | ");
}

/** Expand an alias (following alias-of-alias chains) into `"a" | "b" | ...` when it's a small literal union. */
function literalUnionExpansion(
  ctx: Ctx,
  alias: TypeAliasDeclaration,
  visited: Set<TypeAliasDeclaration>,
): string | undefined {
  if (visited.has(alias)) return undefined;
  visited.add(alias);
  const target = alias.type;
  if (isTypeReferenceNode(target)) {
    const next = resolveLocalTypeAlias(ctx, target.typeName);
    return next ? literalUnionExpansion(ctx, next, visited) : undefined;
  }
  if (
    isUnionTypeNode(target) &&
    target.types.length <= EXPAND_MEMBER_CAP &&
    target.types.every((t) => isLiteralTypeNode(t))
  ) {
    return target.types.map((t) => t.getText()).join(" | ");
  }
  return undefined;
}

function stripUndefined(typeText: string): string {
  const parts = typeText.split(" | ").filter((p) => p !== "undefined");
  return parts.length > 0 ? parts.join(" | ") : typeText;
}

// ---------------------------------------------------------------------------
// JSDoc

function jsDocDescription(ctx: Ctx, component: string, prop: OwnProp): string {
  const docs = new Set<string>();
  for (const symbol of prop.symbols) {
    const doc = ctx.checker.getDocumentationCommentOfSymbol(symbol).trim();
    if (doc !== "") docs.add(doc);
  }
  // Union-branch declarations (List's `ordered`) each carry a copy of the
  // doc; silent divergence would show different text on the site vs in IDE
  // hovers, so unequal copies are a build error.
  if (docs.size > 1) {
    fail(
      component,
      `prop "${prop.name}" has diverging JSDoc across its declarations — keep the copies identical`,
    );
  }
  return docs.values().next().value ?? "";
}

/**
 * Default declared via a `@default` JSDoc tag — the channel for defaults the
 * implementation applies outside destructuring (CSS custom-property fallbacks
 * like Stack's gap). The tag text is displayed verbatim in the Default column.
 */
function defaultFromJsDocTag(ctx: Ctx, component: string, prop: OwnProp): string | undefined {
  const values = new Set<string>();
  for (const symbol of prop.symbols) {
    for (const tag of ctx.checker.getJsDocTagsOfSymbol(symbol)) {
      if (tag.name === "default" && tag.text !== undefined && tag.text.trim() !== "") {
        values.add(tag.text.trim());
      }
    }
  }
  if (values.size > 1) {
    fail(component, `prop "${prop.name}" has diverging @default tags across its declarations`);
  }
  return values.values().next().value;
}

// ---------------------------------------------------------------------------
// Implementation destructuring (defaults + invariants)

/**
 * Keys destructured from the props object by the component implementation,
 * mapped to their initializer source text (the prop's default) when present.
 * Handles both parameter destructuring and the `props` → body-destructure
 * pattern (List).
 */
function destructuredProps(
  ctx: Ctx,
  component: string,
  sourceFile: SourceFile,
): Map<string, string | undefined> {
  const fn = sourceFile.statements.find(
    (s) => isFunctionDeclaration(s) && s.name?.getText() === component,
  );
  if (!fn || !isFunctionDeclaration(fn)) {
    fail(component, `no exported function declaration named "${component}"`);
  }
  const param = fn.parameters[0];
  if (!param) fail(component, "component function takes no props parameter");
  let pattern = isObjectBindingPattern(param.name) ? param.name : undefined;
  if (!pattern && isIdentifier(param.name) && fn.body) {
    pattern = findBodyDestructure(fn.body, param.name.getText());
  }
  if (!pattern) {
    fail(component, "could not find the props destructuring pattern (parameter or body)");
  }
  const result = new Map<string, string | undefined>();
  for (const element of pattern.elements) {
    if (element.dotDotDotToken) continue;
    const keyNode = element.propertyName ?? element.name;
    if (!keyNode) fail(component, "binding element without a name in the props destructuring");
    result.set(keyNode.getText(), element.initializer?.getText());
  }
  return result;
}

/** Find `const { ... } = <paramName>` at the top level of the function body. */
function findBodyDestructure(body: Block, paramName: string) {
  for (const statement of body.statements) {
    if (!isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (
        decl.initializer &&
        isIdentifier(decl.initializer) &&
        decl.initializer.getText() === paramName &&
        isObjectBindingPattern(decl.name)
      ) {
        return decl.name;
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Passthrough (native attribute) analysis

type RawPassthroughLeaf = {
  /** The `ComponentProps<...>` / `ComponentPropsWithoutRef<...>` reference node itself. */
  node: TypeReferenceNode;
  argument: TypeNode | undefined;
  withoutRef: boolean;
  omitted: string[];
};

/**
 * Walk the Props alias declaration and classify every leaf: object literals
 * are own props (extracted via the checker), `ComponentProps*` references are
 * native passthrough. Anything else is an error — a new Props shape must be
 * classified here explicitly.
 */
function collectPassthroughLeaves(
  ctx: Ctx,
  component: string,
  alias: TypeAliasDeclaration,
): RawPassthroughLeaf[] {
  const leaves: RawPassthroughLeaf[] = [];
  // Circularity guard keyed by (alias, omitted-context). The same alias
  // reached from two union branches under DIFFERENT Omit contexts contributes
  // one leaf per context, so it must be walked once per context — only a
  // re-visit in the SAME context is a cycle. Keying on the alias alone would
  // silently drop every context after the first.
  const visited = new Map<TypeAliasDeclaration, Set<string>>();

  const walk = (node: TypeNode, omitted: string[]): void => {
    if (isParenthesizedTypeNode(node)) {
      walk(node.type, omitted);
      return;
    }
    if (isIntersectionTypeNode(node) || isUnionTypeNode(node)) {
      for (const member of node.types) walk(member, omitted);
      return;
    }
    if (isTypeLiteralNode(node)) return; // own props — handled by the checker
    if (isTypeReferenceNode(node)) {
      const name = entityNameText(node.typeName);
      if (name === "Omit") {
        const [target, keys] = node.typeArguments ?? [];
        if (!target || !keys) fail(component, "Omit<...> without two type arguments");
        walk(target, [...omitted, ...omittedKeys(ctx, component, keys)]);
        return;
      }
      if (
        (name === "ComponentProps" || name === "ComponentPropsWithoutRef") &&
        resolvesToReactTypes(ctx, node.typeName)
      ) {
        leaves.push({
          node,
          argument: node.typeArguments?.[0],
          withoutRef: name === "ComponentPropsWithoutRef",
          omitted,
        });
        return;
      }
      const localAlias = resolveLocalTypeAlias(ctx, node.typeName);
      if (localAlias) {
        const context = [...omitted].sort().join(",");
        const seenContexts = visited.get(localAlias) ?? new Set<string>();
        if (seenContexts.has(context)) return;
        seenContexts.add(context);
        visited.set(localAlias, seenContexts);
        walk(localAlias.type, omitted);
        return;
      }
      fail(component, `unclassifiable type reference "${node.getText()}" in Props alias`);
    }
    fail(component, `unclassifiable node in Props alias: "${node.getText()}"`);
  };

  walk(alias.type, []);
  if (leaves.length === 0) {
    fail(component, "no native passthrough (ComponentProps<...>) found in Props alias");
  }
  return leaves;
}

/**
 * Keys named by Omit's second argument. `keyof <local type>` resolves to the
 * target's actual property names — no "those resurface as own props"
 * assumption: when they DO resurface (Button's `keyof ButtonOwnProps<E>`
 * pattern) finalizePassthrough's own-name filter drops them from the display,
 * and when they don't, they are genuinely omitted and must be reported.
 */
function omittedKeys(ctx: Ctx, component: string, keys: TypeNode): string[] {
  if (isLiteralTypeNode(keys) && isStringLiteral(keys.literal)) return [keys.literal.text];
  if (isUnionTypeNode(keys)) {
    return keys.types.flatMap((k) => omittedKeys(ctx, component, k));
  }
  if (isTypeOperatorNode(keys) && keys.operator === SyntaxKind.KeyOfKeyword) {
    const operand = keys.type;
    const target = isTypeReferenceNode(operand)
      ? resolveLocalTypeAlias(ctx, operand.typeName)
      : undefined;
    if (!target) {
      fail(component, `Omit<..., keyof ${operand.getText()}> does not target a local type`);
    }
    const targetType = ctx.checker.getTypeAtLocation(target.name);
    if (!targetType || targetType.isErrorType()) {
      fail(component, `could not resolve the keys of "keyof ${operand.getText()}"`);
    }
    const names = ctx.checker.getPropertiesOfType(targetType).map((p) => p.name);
    if (names.length === 0) {
      fail(component, `"keyof ${operand.getText()}" resolved to zero properties`);
    }
    return names;
  }
  fail(component, `unclassifiable Omit key type "${keys.getText()}"`);
}

/**
 * Property names of the component's fixed-tag passthrough targets — e.g.
 * everything `ComponentProps<"pre">` accepts — minus `Omit`-ted keys. Feeds
 * invariant 2: a destructured key must be an own prop, a universally merged
 * key, or a real native prop of a passthrough target (implementations may
 * intercept-and-chain those, like CodeBlock's onBlur). Polymorphic leaves
 * (`ComponentPropsWithoutRef<E>`) contribute nothing — their attribute set
 * depends on the `as` target; the universal set covers what those components
 * actually destructure.
 */
function nativePassthroughKeys(
  ctx: Ctx,
  component: string,
  leaves: RawPassthroughLeaf[],
): Set<string> {
  const keys = new Set<string>();
  for (const leaf of leaves) {
    const argument = leaf.argument;
    if (!(argument && isLiteralTypeNode(argument) && isStringLiteral(argument.literal))) continue;
    const type = ctx.checker.getTypeFromTypeNode(leaf.node);
    if (!type || type.isErrorType()) {
      fail(component, `could not resolve the native props of "${leaf.node.getText()}"`);
    }
    for (const prop of ctx.checker.getPropertiesOfType(type)) {
      if (!leaf.omitted.includes(prop.name)) keys.add(prop.name);
    }
  }
  return keys;
}

function finalizePassthrough(
  ctx: Ctx,
  component: string,
  alias: TypeAliasDeclaration,
  leaves: RawPassthroughLeaf[],
  ownProps: OwnProp[],
): PassthroughDoc[] {
  const ownNames = new Set(ownProps.map((p) => p.name));
  const docs: PassthroughDoc[] = [];
  for (const leaf of leaves) {
    const omitted = leaf.omitted.filter((k) => !ownNames.has(k));
    const argument = leaf.argument;
    if (!argument) fail(component, "ComponentProps<...> without a type argument");
    if (isLiteralTypeNode(argument) && isStringLiteral(argument.literal)) {
      docs.push({ kind: "tag", tag: argument.literal.text, omitted });
      continue;
    }
    if (isTypeReferenceNode(argument)) {
      const paramName = entityNameText(argument.typeName);
      const paramDecl = resolveTypeParameter(ctx, argument.typeName);
      // Identity (declaration position), not name text: a leaf found inside a
      // generic local wrapper alias carries THAT alias's type parameter, which
      // can share a name with the component alias's parameter — matching by
      // name would silently mis-document a fixed tag as polymorphic.
      const typeParam =
        paramDecl &&
        alias.typeParameters?.find(
          (p) =>
            p.pos === paramDecl.pos &&
            p.getSourceFile().fileName === paramDecl.getSourceFile().fileName,
        );
      if (paramDecl && !typeParam) {
        fail(
          component,
          `passthrough type parameter "${paramName}" belongs to a nested generic alias, not to ${alias.name.getText()} — type-argument substitution is not supported`,
        );
      }
      if (typeParam) {
        const viaProp = ownProps.find(
          (p) => p.declarations[0]?.type?.getText() === paramName,
        )?.name;
        if (!viaProp) {
          fail(component, `no own prop is typed as the type parameter "${paramName}"`);
        }
        const defaultNode = typeParam.defaultType;
        const defaultTag =
          defaultNode && isLiteralTypeNode(defaultNode) && isStringLiteral(defaultNode.literal)
            ? defaultNode.literal.text
            : undefined;
        docs.push({ kind: "polymorphic", viaProp, defaultTag, refExcluded: leaf.withoutRef });
        continue;
      }
    }
    fail(component, `unclassifiable ComponentProps argument "${argument.getText()}"`);
  }
  // Union branches can repeat the same leaf — dedupe on the rendered identity.
  const seen = new Set<string>();
  return docs.filter((d) => {
    const key = JSON.stringify(d);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Entry point

export function componentPropsDoc(component: string): ComponentPropsDoc {
  const ctx = getCtx();
  const cached = ctx.docCache.get(component);
  if (cached) return cached;
  const fileName = path.join(ctx.coreDir, "src", "components", component, `${component}.tsx`);
  const sourceFile = ctx.project.program.getSourceFile(fileName);
  if (!sourceFile) fail(component, `source file not found: ${fileName}`);

  const aliasName = `${component}Props`;
  const alias = sourceFile.statements.find(
    (s): s is TypeAliasDeclaration => isTypeAliasDeclaration(s) && s.name.getText() === aliasName,
  );
  if (!alias) fail(component, `no exported type alias "${aliasName}"`);

  const aliasType = ctx.checker.getTypeAtLocation(alias.name);
  if (!aliasType || aliasType.isErrorType()) {
    fail(component, `checker could not resolve "${aliasName}"`);
  }

  const ownProps = collectOwnProps(ctx, component, aliasType);
  const leaves = collectPassthroughLeaves(ctx, component, alias);
  const passthrough = finalizePassthrough(ctx, component, alias, leaves, ownProps);
  const defaults = destructuredProps(ctx, component, sourceFile);

  // Invariant 1: every own prop must be consumed (destructured) by the
  // implementation — otherwise the extraction (or the component) is wrong.
  for (const prop of ownProps) {
    if (!defaults.has(prop.name)) {
      fail(component, `own prop "${prop.name}" is not destructured by the implementation`);
    }
  }
  // Invariant 2: every destructured key is an own prop, a universally merged
  // key, or a real native prop of a fixed-tag passthrough target — catches
  // extraction misses (e.g. an own prop wrongly classified as native) without
  // a hand-maintained per-component exemption list.
  const ownNames = new Set(ownProps.map((p) => p.name));
  const nativeKeys = nativePassthroughKeys(ctx, component, leaves);
  for (const key of defaults.keys()) {
    if (!ownNames.has(key) && !UNIVERSAL_DESTRUCTURED_KEYS.has(key) && !nativeKeys.has(key)) {
      fail(
        component,
        `destructured key "${key}" is neither an own prop, a universally merged key, nor a native prop of a passthrough target`,
      );
    }
  }

  const polymorphicDefaults = new Map<string, string>();
  for (const entry of passthrough) {
    if (entry.kind === "polymorphic" && entry.defaultTag !== undefined) {
      polymorphicDefaults.set(entry.viaProp, `"${entry.defaultTag}"`);
    }
  }

  const props: PropDoc[] = ownProps.map((prop) => {
    const declTypes = new Set(prop.declarations.map((d) => d.type?.getText()));
    let typeText: string;
    const firstType = prop.declarations[0]?.type;
    if (declTypes.size === 1 && firstType) {
      typeText = renderTypeNode(ctx, firstType);
    } else {
      // Branch-divergent declarations (List's `ordered: false` / `ordered: true`):
      // let the checker compute the merged type.
      const symbol = ctx.checker.getPropertyOfType(aliasType, prop.name);
      const type = symbol && ctx.checker.getTypeOfSymbol(symbol);
      if (!type) fail(component, `could not compute a merged type for prop "${prop.name}"`);
      typeText = stripUndefined(ctx.checker.typeToString(type));
    }
    // Exactly one default source per prop: a destructuring initializer, the
    // `as` type-param default, or an @default tag. Two sources for the same
    // prop is a drift hazard (they can silently disagree), so it's an error.
    const defaultSources = [
      defaults.get(prop.name),
      polymorphicDefaults.get(prop.name),
      defaultFromJsDocTag(ctx, component, prop),
    ].filter((v): v is string => v !== undefined);
    if (defaultSources.length > 1) {
      fail(
        component,
        `prop "${prop.name}" declares its default in more than one place (destructuring initializer / type-param default / @default tag) — keep exactly one`,
      );
    }
    return {
      name: prop.name,
      type: typeText,
      required: !prop.optional,
      defaultValue: defaultSources[0],
      description: jsDocDescription(ctx, component, prop),
    };
  });

  const doc: ComponentPropsDoc = { component, props, passthrough };
  ctx.docCache.set(component, doc);
  return doc;
}
