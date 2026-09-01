export function mapInvestmentDto(dto) {
  return { ...dto, valuePln: Number(dto.valuePln) };
}

export function mapOperationDto(dto) {
  return { ...dto, amountPln: Number(dto.amountPln) };
}

export function mapCollectionDto(dto) {
  return Array.isArray(dto) ? dto : dto.values;
}

export function mapPerformanceDto(dto) {
  return {
    ...dto,
    monthlyResultPln: Number(dto.monthlyResultPln),
    monthlyReturnRatePercent: dto.monthlyReturnRatePercent == null ? null : Number(dto.monthlyReturnRatePercent),
    nominalResultPln: Number(dto.nominalResultPln)
  };
}
