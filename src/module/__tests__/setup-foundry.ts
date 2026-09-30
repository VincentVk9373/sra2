/**
 * A minimal stand-in for the Foundry globals this system touches while a
 * module is being evaluated.
 *
 * The data models extend `foundry.abstract.TypeDataModel` at class-definition
 * time, so merely importing a helper that transitively reaches one throws
 * `ReferenceError: foundry is not defined` before any test body runs. Because
 * that happens during collection, vitest reports the whole file as failed and
 * none of its tests run at all. Defining the globals here keeps the
 * production code untouched.
 *
 * This is deliberately not a Foundry emulation: it only makes the class
 * bodies evaluate. A test that needs real behaviour from one of these must
 * mock it itself.
 */

/** Stands in for the base class the data models extend. */
class TypeDataModelStub {
  static defineSchema(): Record<string, unknown> {
    return {};
  }

  constructor(source: Record<string, unknown> = {}) {
    Object.assign(this, source);
  }
}

/** A field records its options; the schemas are declared, not exercised. */
const field =
  (type: string) =>
  (...args: unknown[]) => ({ fieldType: type, options: args[0] ?? {} });

const foundryStub = {
  abstract: {
    TypeDataModel: TypeDataModelStub,
    DataModel: TypeDataModelStub,
  },
  data: {
    fields: {
      StringField: field('string'),
      NumberField: field('number'),
      BooleanField: field('boolean'),
      ArrayField: field('array'),
      SchemaField: field('schema'),
      HTMLField: field('html'),
    },
  },
};

/** Dialog and sheet classes extend this bare global at definition time. */
class ApplicationStub {
  static get defaultOptions(): Record<string, unknown> {
    return {};
  }
}

Object.assign(globalThis, {
  foundry: foundryStub,
  // Still referenced through the deprecated bare global in places.
  Application: ApplicationStub,
});
