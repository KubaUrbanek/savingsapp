// @ts-nocheck
export class MappingError extends Error {
  constructor(path, value, cause) {
    super(`Cannot map server value at ${path}: ${JSON.stringify(value)}`, { cause });
    this.name = 'MappingError';
    this.path = path;
    this.value = value;
  }
}

export function mapped(path, value, parser) {
  try {
    return parser(value);
  } catch (error) {
    if (error instanceof MappingError) throw error;
    throw new MappingError(path, value, error);
  }
}
