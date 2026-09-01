// @ts-nocheck
import {
  InvestmentEntry,
  InvestmentOperation,
  InvestmentSubcategory,
  InvestmentType,
  OperationType,
  OwnerId
} from '../../../domain/portfolio/index.js';
import { MappingError, mapped } from './MappingError.js';

const SERVER_OPERATION_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL'];

function record(dto, path) {
  if (dto === null || typeof dto !== 'object' || Array.isArray(dto))
    throw new MappingError(path, dto, new TypeError('Expected an object'));
  return dto;
}

export function mapInvestmentTypeDto(value, path = 'type') {
  return mapped(path, value, InvestmentType.parse.bind(InvestmentType));
}

export function mapInvestmentSubcategoryDto(value, path = 'subcategory') {
  if (value === null) return null;
  // Missing and empty values are malformed transport data, not optional domain values.
  if (value === undefined || value === '')
    throw new MappingError(path, value, new TypeError('Expected null or a known subcategory'));
  return mapped(path, value, InvestmentSubcategory.parse.bind(InvestmentSubcategory));
}

export function mapOperationTypeDto(value, path = 'operationType') {
  if (!SERVER_OPERATION_TYPES.includes(value))
    throw new MappingError(path, value, new TypeError('Unknown server operation type'));
  return OperationType.parse(value);
}

export function mapOwnerIdDto(value, path = 'owner') {
  return mapped(path, value, OwnerId.parse.bind(OwnerId));
}

export function mapInvestmentDto(value) {
  const dto = record(value, 'investment');
  return mapped('investment', dto, () =>
    InvestmentEntry.create({
      ...dto,
      type: mapInvestmentTypeDto(dto.type),
      owner: mapOwnerIdDto(dto.owner),
      subcategory: mapInvestmentSubcategoryDto(dto.subcategory)
    })
  );
}

export function mapOperationDto(value) {
  const dto = record(value, 'operation');
  return mapped('operation', dto, () =>
    InvestmentOperation.create({
      ...dto,
      operationType: mapOperationTypeDto(dto.operationType),
      type: mapInvestmentTypeDto(dto.type),
      owner: mapOwnerIdDto(dto.owner),
      subcategory: mapInvestmentSubcategoryDto(dto.subcategory)
    })
  );
}

export function mapCollectionDto(dto) {
  const values = Array.isArray(dto) ? dto : record(dto, 'collection').values;
  if (!Array.isArray(values)) throw new MappingError('collection.values', values, new TypeError('Expected an array'));
  return values;
}

export function mapInvestmentTypesDto(dto) {
  return mapCollectionDto(dto).map((value, index) => mapInvestmentTypeDto(value, `values[${index}]`));
}
