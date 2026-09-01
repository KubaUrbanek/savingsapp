import { mapCollectionDto, mapInvestmentTypesDto, mapOwnerIdDto } from './mappers/portfolioDtoMapper.js';
export class FetchReferenceDataGateway {
  constructor(http) { this.http = http; }
  async load({ signal } = {}) {
    const [users, types] = await Promise.all([this.http.json('/users', { signal }), this.http.json('/investment-types', { signal })]);
    return {
      users: mapCollectionDto(users).map((value, index) => mapOwnerIdDto(value, `users[${index}]`)),
      types: mapInvestmentTypesDto(types)
    };
  }
}
