// @ts-nocheck
export { mapCollectionDto, mapInvestmentDto, mapOperationDto } from './mappers/portfolioDtoMapper.js';

export function mapPerformanceDto(dto) {
  return {
    ...dto,
    monthlyResultPln: Number(dto.monthlyResultPln),
    monthlyReturnRatePercent: dto.monthlyReturnRatePercent == null ? null : Number(dto.monthlyReturnRatePercent),
    nominalResultPln: Number(dto.nominalResultPln)
  };
}
