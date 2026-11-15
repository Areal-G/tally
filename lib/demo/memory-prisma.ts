/**
 * In-memory Prisma client for the public demo.
 *
 * The demo branch runs without a database: `prisma/client.ts` exports this
 * client instead of a real `PrismaClient`. It is driven by the generated
 * Prisma schema metadata (`Prisma.dmmf`), so every model, default, unique
 * field and relation matches `prisma/schema.prisma` without hand-written
 * model code.
 *
 * Supported surface (everything the app uses):
 *  - findMany / findFirst / findFirstOrThrow / findUnique / findUniqueOrThrow
 *    with where, select, include (incl. `_count`), orderBy, skip, take, distinct
 *  - create (nested `create` / `connect`), createMany
 *  - update / updateMany (set, increment, decrement, multiply, divide, push, unset)
 *  - delete / deleteMany with `onDelete: Cascade`
 *  - count, aggregate (_count, _sum, _avg, _min, _max), groupBy
 *  - $transaction (callback or array), $connect, $disconnect
 *
 * Unsupported query shapes throw instead of silently returning wrong data.
 *
 * IDs come from a counter, not randomness: every server instance that runs the
 * same seed produces identical IDs, so links and JWT sessions stay valid no
 * matter which instance serves a request.
 */

import { Prisma, type PrismaClient } from "@prisma/client";

type Row = Record<string, unknown>;
type Args = Record<string, unknown>;
type DmmfModel = (typeof Prisma.dmmf.datamodel.models)[number];
type DmmfField = DmmfModel["fields"][number];

type ModelInfo = {
  name: string;
  fields: readonly DmmfField[];
  byName: Map<string, DmmfField>;
  idField: string;
  uniqueFields: string[];
};

/** First 8 hex chars of every generated id; the rest is a zero-padded counter. */
const OBJECT_ID_PREFIX = "64d0e000";

const FILTER_KEYS = new Set([
  "equals",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "startsWith",
  "endsWith",
  "mode",
  "not",
  "isSet",
  "has",
  "hasEvery",
  "hasSome",
  "isEmpty",
]);

const UPDATE_OPERATORS = new Set([
  "set",
  "increment",
  "decrement",
  "multiply",
  "divide",
  "push",
  "unset",
]);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  !(v instanceof Date) &&
  !(v instanceof Uint8Array);

const toArray = <T,>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The single `{ key: value }` entry of a one-key object (orderBy specs, update operators). */
function onlyEntry(obj: unknown): [string, unknown] {
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length !== 1) {
    throw new Error(`[memory-prisma] Expected exactly one key, got: ${JSON.stringify(obj)}`);
  }
  return entries[0]!;
}

function cloneValue<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value) || isPlainObject(value)) return structuredClone(value);
  return value;
}

/** Comparable primitive for equality / ordering (Dates by time, BigInt kept). */
function comparable(v: unknown): unknown {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return v;
}

function compare(a: unknown, b: unknown): number {
  let x = comparable(a);
  let y = comparable(b);
  if (typeof x === "bigint" && typeof y === "number") y = BigInt(Math.trunc(y));
  if (typeof x === "number" && typeof y === "bigint") x = BigInt(Math.trunc(x));
  if (x === y) return 0;
  if (x == null) return -1; // MongoDB sorts null / missing first
  if (y == null) return 1;
  return (x as number) < (y as number) ? -1 : 1;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null;
  if (isPlainObject(a) || isPlainObject(b) || Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a, jsonReplacer) === JSON.stringify(b, jsonReplacer);
  }
  return compare(a, b) === 0;
}

function jsonReplacer(_key: string, v: unknown) {
  return typeof v === "bigint" ? v.toString() : v;
}

function knownError(code: string, message: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: Prisma.prismaVersion.client,
    meta,
  });
}

export class MemoryDatabase {
  private readonly models = new Map<string, ModelInfo>();
  private readonly tables = new Map<string, Row[]>();
  private idCounter = 0;

  constructor(datamodel = Prisma.dmmf.datamodel) {
    for (const m of datamodel.models) {
      const byName = new Map(m.fields.map((f) => [f.name, f]));
      const idField = m.fields.find((f) => f.isId)?.name ?? "id";
      this.models.set(m.name, {
        name: m.name,
        fields: m.fields,
        byName,
        idField,
        uniqueFields: m.fields.filter((f) => f.isUnique || f.isId).map((f) => f.name),
      });
      this.tables.set(m.name, []);
    }
  }

  /** Deterministic 24-hex-char ObjectId. */
  nextObjectId(): string {
    this.idCounter += 1;
    return OBJECT_ID_PREFIX + this.idCounter.toString(16).padStart(16, "0");
  }

  /** Build a PrismaClient-shaped object over this database. */
  createClient(ready: Promise<void> = Promise.resolve()): PrismaClient {
    const client: Record<string, unknown> = {
      $connect: async () => {},
      $disconnect: async () => {},
      $transaction: async (arg: unknown) => {
        await ready;
        if (typeof arg === "function") return (arg as (tx: unknown) => unknown)(client);
        const results: unknown[] = [];
        for (const op of arg as Promise<unknown>[]) results.push(await op);
        return results;
      },
    };
    for (const model of this.models.values()) {
      client[lowerFirst(model.name)] = this.createDelegate(model.name, ready);
    }
    return client as unknown as PrismaClient;
  }

  // ---------------------------------------------------------------- delegates

  private createDelegate(modelName: string, ready: Promise<void>) {
    const run =
      <A extends unknown[], R>(fn: (...a: A) => R) =>
      async (...a: A): Promise<R> => {
        await ready;
        return fn(...a);
      };
    const orThrow = (row: unknown) => {
      if (row == null) throw knownError("P2025", `No ${modelName} found`);
      return row;
    };
    return {
      findMany: run((args: Args = {}) => this.findMany(modelName, args)),
      findFirst: run((args: Args = {}) => this.findMany(modelName, { ...args, take: 1 })[0] ?? null),
      findFirstOrThrow: run((args: Args = {}) =>
        orThrow(this.findMany(modelName, { ...args, take: 1 })[0]),
      ),
      findUnique: run((args: Args) => this.findMany(modelName, { ...args, take: 1 })[0] ?? null),
      findUniqueOrThrow: run((args: Args) =>
        orThrow(this.findMany(modelName, { ...args, take: 1 })[0]),
      ),
      create: run((args: Args) => this.project(modelName, this.insert(modelName, args.data as Row), args)),
      createMany: run((args: Args) => {
        const rows = toArray(args.data as Row | Row[]);
        for (const data of rows) this.insert(modelName, data);
        return { count: rows.length };
      }),
      update: run((args: Args) => {
        const row = this.findOne(modelName, args.where as Args);
        if (!row) throw knownError("P2025", `Record to update not found (${modelName})`);
        this.applyUpdate(modelName, row, args.data as Row);
        return this.project(modelName, row, args);
      }),
      updateMany: run((args: Args = {}) => {
        const rows = this.filter(modelName, args.where as Args);
        for (const row of rows) this.applyUpdate(modelName, row, args.data as Row);
        return { count: rows.length };
      }),
      delete: run((args: Args) => {
        const row = this.findOne(modelName, args.where as Args);
        if (!row) throw knownError("P2025", `Record to delete does not exist (${modelName})`);
        const result = this.project(modelName, row, args);
        this.remove(modelName, [row]);
        return result;
      }),
      deleteMany: run((args: Args = {}) => {
        const rows = this.filter(modelName, args.where as Args);
        this.remove(modelName, rows);
        return { count: rows.length };
      }),
      count: run((args: Args = {}) => {
        const rows = this.filter(modelName, args.where as Args);
        if (!isPlainObject(args.select)) return rows.length;
        const out: Row = {};
        for (const key of Object.keys(args.select)) {
          out[key] = key === "_all" ? rows.length : rows.filter((r) => r[key] != null).length;
        }
        return out;
      }),
      aggregate: run((args: Args = {}) =>
        this.aggregateRows(modelName, this.filter(modelName, args.where as Args), args),
      ),
      groupBy: run((args: Args) => this.groupBy(modelName, args)),
    };
  }

  // ------------------------------------------------------------------ reading

  private model(name: string): ModelInfo {
    const m = this.models.get(name);
    if (!m) throw new Error(`[memory-prisma] Unknown model ${name}`);
    return m;
  }

  private table(name: string): Row[] {
    return this.tables.get(name)!;
  }

  private filter(modelName: string, where?: Args): Row[] {
    return this.table(modelName).filter((row) => this.matches(modelName, row, where));
  }

  private findOne(modelName: string, where: Args): Row | undefined {
    return this.table(modelName).find((row) => this.matches(modelName, row, where));
  }

  private findMany(modelName: string, args: Args): Row[] {
    let rows = this.filter(modelName, args.where as Args | undefined);
    if (args.cursor) throw new Error("[memory-prisma] cursor pagination is not supported");
    if (args.orderBy) rows = this.sort(modelName, rows, args.orderBy);
    if (Array.isArray(args.distinct)) {
      const seen = new Set<string>();
      const keys = args.distinct as string[];
      rows = rows.filter((r) => {
        const k = JSON.stringify(keys.map((key) => comparable(r[key])), jsonReplacer);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    const skip = typeof args.skip === "number" ? args.skip : 0;
    if (typeof args.take === "number") {
      rows = args.take >= 0 ? rows.slice(skip, skip + args.take) : rows.slice(Math.max(0, rows.length - skip + args.take), rows.length - skip);
    } else if (skip) {
      rows = rows.slice(skip);
    }
    return rows.map((r) => this.project(modelName, r, args));
  }

  private matches(modelName: string, row: Row, where?: Args): boolean {
    if (!where) return true;
    const model = this.model(modelName);
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === "AND") {
        if (!toArray(cond as Args | Args[]).every((w) => this.matches(modelName, row, w))) return false;
        continue;
      }
      if (key === "OR") {
        if (!(cond as Args[]).some((w) => this.matches(modelName, row, w))) return false;
        continue;
      }
      if (key === "NOT") {
        if (toArray(cond as Args | Args[]).some((w) => this.matches(modelName, row, w))) return false;
        continue;
      }
      const field = model.byName.get(key);
      if (!field) {
        // Compound unique input, e.g. { productId_warehouseId: { productId, warehouseId } }
        if (isPlainObject(cond) && !this.matches(modelName, row, cond)) return false;
        if (!isPlainObject(cond)) throw new Error(`[memory-prisma] Unknown field ${modelName}.${key}`);
        continue;
      }
      if (field.kind === "object") {
        if (!this.matchesRelation(modelName, row, field, cond)) return false;
        continue;
      }
      if (!this.matchesScalar(row[key], cond, field)) return false;
    }
    return true;
  }

  private matchesRelation(modelName: string, row: Row, field: DmmfField, cond: unknown): boolean {
    const related = this.related(modelName, row, field);
    if (field.isList) {
      const c = cond as Args;
      const sub = (w: unknown) => (r: Row) => this.matches(field.type, r, w as Args);
      if (c.some !== undefined && !related.some(sub(c.some))) return false;
      if (c.every !== undefined && !related.every(sub(c.every))) return false;
      if (c.none !== undefined && related.some(sub(c.none))) return false;
      return true;
    }
    const target = related[0];
    if (cond === null) return target === undefined;
    const c = cond as Args;
    if ("is" in c || "isNot" in c) {
      if (c.is !== undefined) {
        if (c.is === null ? target !== undefined : !target || !this.matches(field.type, target, c.is as Args)) return false;
      }
      if (c.isNot !== undefined) {
        if (c.isNot === null ? target === undefined : !!target && this.matches(field.type, target, c.isNot as Args)) return false;
      }
      return true;
    }
    return !!target && this.matches(field.type, target, c);
  }

  private matchesScalar(value: unknown, cond: unknown, field: DmmfField): boolean {
    const isFilter =
      isPlainObject(cond) &&
      Object.keys(cond).length > 0 &&
      Object.keys(cond).every((k) => FILTER_KEYS.has(k));
    if (!isFilter) {
      if (field.isList && Array.isArray(cond)) return valuesEqual(value ?? [], cond);
      return valuesEqual(value, cond);
    }
    const c = cond as Args;
    const insensitive = c.mode === "insensitive";
    const norm = (v: unknown) => (insensitive && typeof v === "string" ? v.toLowerCase() : v);
    const v = norm(value);
    for (const [op, arg] of Object.entries(c)) {
      if (arg === undefined || op === "mode") continue;
      const a = norm(arg);
      switch (op) {
        case "equals":
          if (field.isList ? !valuesEqual(value ?? [], arg) : !valuesEqual(v, a)) return false;
          break;
        case "in":
          if (!(a as unknown[]).some((x) => valuesEqual(v, norm(x)))) return false;
          break;
        case "notIn":
          if ((a as unknown[]).some((x) => valuesEqual(v, norm(x)))) return false;
          break;
        case "lt":
          if (v == null || compare(v, a) >= 0) return false;
          break;
        case "lte":
          if (v == null || compare(v, a) > 0) return false;
          break;
        case "gt":
          if (v == null || compare(v, a) <= 0) return false;
          break;
        case "gte":
          if (v == null || compare(v, a) < 0) return false;
          break;
        case "contains":
          if (typeof v !== "string" || !v.includes(a as string)) return false;
          break;
        case "startsWith":
          if (typeof v !== "string" || !v.startsWith(a as string)) return false;
          break;
        case "endsWith":
          if (typeof v !== "string" || !v.endsWith(a as string)) return false;
          break;
        case "not":
          if (isPlainObject(arg) ? this.matchesScalar(value, { ...arg, mode: c.mode }, field) : valuesEqual(v, a)) return false;
          break;
        case "isSet":
          if ((value !== undefined) !== arg) return false;
          break;
        case "has":
          if (!Array.isArray(value) || !value.some((x) => valuesEqual(x, arg))) return false;
          break;
        case "hasEvery":
          if (!Array.isArray(value) || !(arg as unknown[]).every((x) => value.some((y) => valuesEqual(x, y)))) return false;
          break;
        case "hasSome":
          if (!Array.isArray(value) || !(arg as unknown[]).some((x) => value.some((y) => valuesEqual(x, y)))) return false;
          break;
        case "isEmpty":
          if ((!Array.isArray(value) || value.length === 0) !== arg) return false;
          break;
      }
    }
    return true;
  }

  /** Rows on the other side of a relation field. */
  private related(modelName: string, row: Row, field: DmmfField): Row[] {
    const target = this.table(field.type);
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      const from = field.relationFromFields;
      const to = field.relationToFields ?? [];
      return target.filter((t) => from.every((f, i) => row[f] != null && valuesEqual(t[to[i]!], row[f])));
    }
    const back = this.model(field.type).fields.find(
      (f) => f.relationName === field.relationName && f.name !== field.name,
    );
    if (!back?.relationFromFields?.length) {
      throw new Error(`[memory-prisma] Cannot resolve relation ${modelName}.${field.name}`);
    }
    const from = back.relationFromFields;
    const to = back.relationToFields ?? [];
    return target.filter((t) => from.every((f, i) => valuesEqual(t[f], row[to[i]!])));
  }

  private sort(modelName: string, rows: Row[], orderBy: unknown): Row[] {
    const specs = toArray(orderBy as Args | Args[]).flatMap((o) => Object.entries(o));
    const model = this.model(modelName);
    const keyOf = (row: Row, field: string, spec: unknown): { value: unknown; dir: "asc" | "desc" } => {
      const f = model.byName.get(field);
      if (f?.kind === "object") {
        const target = this.related(modelName, row, f)[0];
        const [subField, subDir] = onlyEntry(spec);
        return { value: target?.[subField], dir: subDir as "asc" | "desc" };
      }
      const dir = (isPlainObject(spec) ? spec.sort : spec) as "asc" | "desc";
      return { value: row[field], dir };
    };
    return [...rows].sort((a, b) => {
      for (const [field, spec] of specs) {
        const ka = keyOf(a, field, spec);
        const kb = keyOf(b, field, spec);
        const c = compare(ka.value, kb.value);
        if (c !== 0) return ka.dir === "desc" ? -c : c;
      }
      return 0;
    });
  }

  /** Apply select / include and return a detached copy. */
  private project(modelName: string, row: Row, args: Args = {}): Row {
    const model = this.model(modelName);
    const out: Row = {};
    const scalar = (f: DmmfField) => {
      const v = row[f.name];
      out[f.name] = v === undefined ? (f.isList ? [] : null) : cloneValue(v);
    };
    const relation = (f: DmmfField, spec: unknown) => {
      const nested = isPlainObject(spec) ? spec : {};
      if (f.isList) {
        let rows = this.related(modelName, row, f).filter((r) => this.matches(f.type, r, nested.where as Args));
        if (nested.orderBy) rows = this.sort(f.type, rows, nested.orderBy);
        if (typeof nested.skip === "number") rows = rows.slice(nested.skip);
        if (typeof nested.take === "number") rows = rows.slice(0, nested.take);
        out[f.name] = rows.map((r) => this.project(f.type, r, nested));
      } else {
        const target = this.related(modelName, row, f)[0];
        out[f.name] = target ? this.project(f.type, target, nested) : null;
      }
    };
    const counts = (spec: unknown) => {
      const sel = isPlainObject(spec) && isPlainObject(spec.select) ? spec.select : null;
      const result: Row = {};
      for (const f of model.fields) {
        if (f.kind !== "object" || !f.isList) continue;
        if (sel && !sel[f.name]) continue;
        const where = sel && isPlainObject(sel[f.name]) ? ((sel[f.name] as Args).where as Args) : undefined;
        result[f.name] = this.related(modelName, row, f).filter((r) => this.matches(f.type, r, where)).length;
      }
      out._count = result;
    };

    if (isPlainObject(args.select)) {
      for (const [key, spec] of Object.entries(args.select)) {
        if (!spec) continue;
        if (key === "_count") {
          counts(spec);
          continue;
        }
        const f = model.byName.get(key);
        if (!f) throw new Error(`[memory-prisma] Unknown field in select: ${modelName}.${key}`);
        if (f.kind === "object") relation(f, spec);
        else scalar(f);
      }
      return out;
    }
    for (const f of model.fields) if (f.kind !== "object") scalar(f);
    if (isPlainObject(args.include)) {
      for (const [key, spec] of Object.entries(args.include)) {
        if (!spec) continue;
        if (key === "_count") {
          counts(spec);
          continue;
        }
        const f = model.byName.get(key);
        if (!f || f.kind !== "object") throw new Error(`[memory-prisma] Unknown relation in include: ${modelName}.${key}`);
        relation(f, spec);
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ writing

  private insert(modelName: string, data: Row): Row {
    const model = this.model(modelName);
    const row: Row = {};
    const nested: [DmmfField, Args][] = [];
    const now = new Date();

    for (const f of model.fields) {
      const value = data[f.name];
      if (f.kind === "object") {
        if (value !== undefined) nested.push([f, value as Args]);
        continue;
      }
      if (value !== undefined) {
        const plain = isPlainObject(value) && "set" in value && f.type !== "Json" ? value.set : value;
        row[f.name] = cloneValue(plain);
        continue;
      }
      const def = f.default as unknown;
      if (isPlainObject(def) && typeof def.name === "string") {
        if (def.name === "auto") row[f.name] = this.nextObjectId();
        else if (def.name === "now") row[f.name] = now;
        else throw new Error(`[memory-prisma] Unsupported default ${String(def.name)}() on ${modelName}.${f.name}`);
      } else if (def !== undefined) {
        row[f.name] = cloneValue(def);
      } else if (f.isUpdatedAt) {
        row[f.name] = now;
      }
    }

    // Owning-side relations (connect / create) fill this row's foreign keys first.
    for (const [f, op] of nested) {
      if (!f.relationFromFields?.length) continue;
      const fk = f.relationFromFields[0]!;
      const ref = f.relationToFields?.[0] ?? "id";
      if (op.connect) {
        const target = this.findOne(f.type, op.connect as Args);
        if (!target) throw knownError("P2025", `No ${f.type} found to connect`);
        row[fk] = target[ref];
      } else if (op.create) {
        row[fk] = this.insert(f.type, op.create as Row)[ref];
      } else {
        throw new Error(`[memory-prisma] Unsupported nested write on ${modelName}.${f.name}`);
      }
    }

    for (const f of model.fields) {
      if (f.kind === "object" || !f.isRequired || f.isList) continue;
      if (row[f.name] === undefined) {
        throw new Error(`[memory-prisma] Missing required field ${modelName}.${f.name}`);
      }
    }
    this.assertUnique(modelName, row);
    this.table(modelName).push(row);

    // Back-relations (e.g. order.items.create) are inserted after the parent exists.
    for (const [f, op] of nested) {
      if (f.relationFromFields?.length) continue;
      this.writeChildren(modelName, row, f, op);
    }
    return row;
  }

  private writeChildren(modelName: string, parent: Row, field: DmmfField, op: Args) {
    const back = this.model(field.type).fields.find(
      (f) => f.relationName === field.relationName && f.name !== field.name,
    );
    if (!back?.relationFromFields?.length) {
      throw new Error(`[memory-prisma] Cannot write relation ${modelName}.${field.name}`);
    }
    const fk = back.relationFromFields[0]!;
    const ref = back.relationToFields?.[0] ?? "id";
    for (const [key, value] of Object.entries(op)) {
      if (value === undefined) continue;
      switch (key) {
        case "create":
          for (const child of toArray(value as Row | Row[])) this.insert(field.type, { ...child, [fk]: parent[ref] });
          break;
        case "createMany":
          for (const child of toArray((value as Args).data as Row | Row[])) this.insert(field.type, { ...child, [fk]: parent[ref] });
          break;
        case "deleteMany": {
          const children = this.related(modelName, parent, field);
          const where = toArray(value as Args | Args[]);
          this.remove(field.type, children.filter((c) => where.some((w) => this.matches(field.type, c, w))));
          break;
        }
        default:
          throw new Error(`[memory-prisma] Unsupported nested ${key} on ${modelName}.${field.name}`);
      }
    }
  }

  private applyUpdate(modelName: string, row: Row, data: Row) {
    const model = this.model(modelName);
    const next: Row = { ...row };
    const relationOps: [DmmfField, Args][] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const f = model.byName.get(key);
      if (!f) throw new Error(`[memory-prisma] Unknown field in update: ${modelName}.${key}`);
      if (f.kind === "object") {
        relationOps.push([f, value as Args]);
        continue;
      }
      const isOp =
        isPlainObject(value) &&
        f.type !== "Json" &&
        Object.keys(value).length === 1 &&
        UPDATE_OPERATORS.has(Object.keys(value)[0]!);
      if (!isOp) {
        next[key] = cloneValue(value);
        continue;
      }
      const [op, arg] = onlyEntry(value);
      const current = next[key];
      const num = (x: unknown) => (typeof current === "bigint" ? BigInt(x as number | bigint) : Number(x));
      const cur = current ?? (f.type === "BigInt" ? BigInt(0) : 0);
      switch (op) {
        case "set":
          next[key] = cloneValue(arg);
          break;
        case "unset":
          if (arg) delete next[key];
          break;
        case "increment":
          next[key] = (cur as number) + (num(arg) as number);
          break;
        case "decrement":
          next[key] = (cur as number) - (num(arg) as number);
          break;
        case "multiply":
          next[key] = (cur as number) * (num(arg) as number);
          break;
        case "divide":
          next[key] = (cur as number) / (num(arg) as number);
          break;
        case "push":
          next[key] = [...((current as unknown[]) ?? []), ...toArray(arg)];
          break;
      }
    }
    for (const f of model.fields) if (f.isUpdatedAt && data[f.name] === undefined) next[f.name] = new Date();
    this.assertUnique(modelName, next, row);
    Object.keys(row).forEach((k) => delete row[k]);
    Object.assign(row, next);

    for (const [f, op] of relationOps) {
      if (f.relationFromFields?.length) {
        const fk = f.relationFromFields[0]!;
        const ref = f.relationToFields?.[0] ?? "id";
        if (op.connect) {
          const target = this.findOne(f.type, op.connect as Args);
          if (!target) throw knownError("P2025", `No ${f.type} found to connect`);
          row[fk] = target[ref];
        } else if (op.disconnect) {
          delete row[fk];
        } else {
          throw new Error(`[memory-prisma] Unsupported nested update on ${modelName}.${f.name}`);
        }
      } else {
        this.writeChildren(modelName, row, f, op);
      }
    }
  }

  private assertUnique(modelName: string, row: Row, self?: Row) {
    const model = this.model(modelName);
    for (const field of model.uniqueFields) {
      const v = row[field];
      if (v == null) continue;
      const clash = this.table(modelName).some((r) => r !== self && valuesEqual(r[field], v));
      if (clash) {
        throw knownError("P2002", `Unique constraint failed on the fields: (\`${field}\`)`, {
          target: [field],
          modelName,
        });
      }
    }
  }

  private remove(modelName: string, rows: Row[]) {
    if (rows.length === 0) return;
    const doomed = new Set(rows);
    // Cascade to children whose required relation points at a removed row.
    for (const child of this.models.values()) {
      for (const f of child.fields) {
        if (f.kind !== "object" || f.type !== modelName || f.relationOnDelete !== "Cascade") continue;
        if (!f.relationFromFields?.length) continue;
        const fk = f.relationFromFields[0]!;
        const ref = f.relationToFields?.[0] ?? "id";
        const keys = new Set(rows.map((r) => comparable(r[ref])));
        const orphans = this.table(child.name).filter((c) => keys.has(comparable(c[fk])));
        this.remove(child.name, orphans);
      }
    }
    const kept = this.table(modelName).filter((r) => !doomed.has(r));
    this.tables.set(modelName, kept);
  }

  // -------------------------------------------------------------- aggregation

  private aggregateRows(modelName: string, rows: Row[], args: Args): Row {
    const model = this.model(modelName);
    const out: Row = {};
    const fieldsOf = (spec: unknown) =>
      spec === true ? model.fields.filter((f) => f.kind === "scalar").map((f) => f.name) : Object.keys(spec as Args).filter((k) => (spec as Args)[k]);
    const isBig = (field: string) => model.byName.get(field)?.type === "BigInt";

    if (args._count !== undefined) {
      if (args._count === true) out._count = rows.length;
      else {
        const c: Row = {};
        for (const k of fieldsOf(args._count)) c[k] = k === "_all" ? rows.length : rows.filter((r) => r[k] != null).length;
        out._count = c;
      }
    }
    const numeric = (k: string) => rows.map((r) => r[k]).filter((v) => v != null) as (number | bigint)[];
    if (args._sum) {
      const s: Row = {};
      for (const k of fieldsOf(args._sum)) {
        const vals = numeric(k);
        s[k] = vals.length === 0 ? null : isBig(k) ? vals.reduce<bigint>((a, b) => a + BigInt(b), BigInt(0)) : vals.reduce<number>((a, b) => a + Number(b), 0);
      }
      out._sum = s;
    }
    if (args._avg) {
      const s: Row = {};
      for (const k of fieldsOf(args._avg)) {
        const vals = numeric(k).map(Number);
        s[k] = vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      out._avg = s;
    }
    for (const key of ["_min", "_max"] as const) {
      if (!args[key]) continue;
      const s: Row = {};
      for (const k of fieldsOf(args[key])) {
        const vals = rows.map((r) => r[k]).filter((v) => v != null);
        s[k] = vals.length === 0 ? null : cloneValue(vals.reduce((a, b) => (compare(a, b) * (key === "_min" ? 1 : -1) <= 0 ? a : b)));
      }
      out[key] = s;
    }
    return out;
  }

  private groupBy(modelName: string, args: Args): Row[] {
    const by = toArray(args.by as string | string[]);
    if (args.having) throw new Error("[memory-prisma] groupBy having is not supported");
    const groups = new Map<string, Row[]>();
    for (const row of this.filter(modelName, args.where as Args)) {
      const key = JSON.stringify(by.map((k) => comparable(row[k] ?? null)), jsonReplacer);
      const list = groups.get(key);
      if (list) list.push(row);
      else groups.set(key, [row]);
    }
    let result = [...groups.values()].map((rows) => {
      const out: Row = {};
      for (const k of by) out[k] = cloneValue(rows[0]![k] ?? null);
      return { ...out, ...this.aggregateRows(modelName, rows, args) };
    });
    if (args.orderBy) {
      const specs = toArray(args.orderBy as Args | Args[]).flatMap((o) => Object.entries(o));
      result = result.sort((a, b) => {
        for (const [key, spec] of specs) {
          const [va, vb, dir] = isPlainObject(spec)
            ? (() => {
                const [sub, d] = onlyEntry(spec);
                return [(a[key] as Row)?.[sub], (b[key] as Row)?.[sub], d];
              })()
            : [a[key], b[key], spec];
          const c = compare(va, vb);
          if (c !== 0) return dir === "desc" ? -c : c;
        }
        return 0;
      });
    }
    const skip = typeof args.skip === "number" ? args.skip : 0;
    return typeof args.take === "number" ? result.slice(skip, skip + args.take) : result.slice(skip);
  }
}

/**
 * Create a PrismaClient-compatible in-memory client.
 * `seed` runs once against the raw client; every query waits for it to finish.
 */
export function createMemoryPrismaClient(
  seed?: (client: PrismaClient) => Promise<void>,
): PrismaClient {
  const db = new MemoryDatabase();
  const raw = db.createClient();
  const ready = seed ? seed(raw) : Promise.resolve();
  ready.catch((error) => console.error("[demo] Seeding the in-memory database failed:", error));
  return db.createClient(ready);
}
