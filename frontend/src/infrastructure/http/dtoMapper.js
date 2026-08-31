export function mapInvestmentDto(dto) {
  return { ...dto, valuePln: Number(dto.valuePln) };
}

export function mapOperationDto(dto) {
  return { ...dto, amountPln: Number(dto.amountPln) };
}
