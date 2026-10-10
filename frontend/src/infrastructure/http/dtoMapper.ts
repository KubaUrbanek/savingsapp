// @ts-nocheck
export { mapCollectionDto, mapInvestmentDto, mapOperationDto } from './mappers/portfolioDtoMapper.js';

export function mapPerformanceDto(dto) {
  return {
    ...dto,
    monthlyResultPln: dto.monthlyResultPln == null ? null : Number(dto.monthlyResultPln),
    monthlyReturnRatePercent: dto.monthlyReturnRatePercent == null ? null : Number(dto.monthlyReturnRatePercent),
    nominalResultPln: dto.nominalResultPln == null ? null : Number(dto.nominalResultPln)
  };
}
