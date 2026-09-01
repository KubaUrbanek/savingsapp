import { mapCollectionDto, mapInvestmentTypesDto, mapOwnerIdDto } from './mappers/portfolioDtoMapper.js';
export class FetchReferenceDataGateway {
  constructor(http) { this.http = http; }
  async load() {
    const [users, types] = await Promise.all([this.http.json('/users'), this.http.json('/investment-types')]);
    return {
      users: mapCollectionDto(users).map((value, index) => mapOwnerIdDto(value, `users[${index}]`)),
      types: mapInvestmentTypesDto(types)
    };
  }
}
