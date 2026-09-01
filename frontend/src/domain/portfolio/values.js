export class DomainValidationError extends TypeError {
  constructor(field, message) {
    super(message);
    this.name = 'DomainValidationError';
    this.field = field;
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainValidationError(field, `${field} must be a non-empty string`);
  }
  return value.trim();
}

export const OwnerId = Object.freeze({
  parse(value) { return requiredString(value, 'owner'); },
  of(value) { return this.parse(value); }
});

function decimal(value, field) {
  if (typeof value === 'string' && value.trim() === '') throw new DomainValidationError(field, `${field} is required`);
  if (typeof value !== 'string' && typeof value !== 'number') throw new DomainValidationError(field, `${field} must be a number`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new DomainValidationError(field, `${field} must be finite`);
  return parsed;
}

export const Money = Object.freeze({
  parse(value, { allowZero = true, field = 'money' } = {}) {
    const parsed = decimal(value, field);
    if (parsed < 0 || (!allowZero && parsed === 0)) {
      throw new DomainValidationError(field, allowZero ? `${field} cannot be negative` : `${field} must be positive`);
    }
    if (Math.abs(Math.round(parsed * 100) - parsed * 100) > Number.EPSILON * Math.max(1, Math.abs(parsed * 100))) {
      throw new DomainValidationError(field, `${field} supports at most two decimal places`);
    }
    return parsed;
  },
  zeroOrPositive(value, field = 'money') { return this.parse(value, { field }); },
  positive(value, field = 'money') { return this.parse(value, { allowZero: false, field }); }
});

export const ValuationDate = Object.freeze({
  parse(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new DomainValidationError('date', 'date must use YYYY-MM-DD');
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new DomainValidationError('date', 'date must be a real calendar date');
    }
    return value;
  },
  of(value) { return this.parse(value); }
});

export const AllocationWeight = Object.freeze({
  parse(value) {
    const parsed = decimal(value, 'weight');
    if (parsed < 0 || parsed > 100) throw new DomainValidationError('weight', 'weight must be between 0 and 100');
    return parsed;
  },
  of(value) { return this.parse(value); }
});
