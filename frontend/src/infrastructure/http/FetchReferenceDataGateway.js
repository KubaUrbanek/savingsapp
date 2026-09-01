import { mapCollectionDto } from './dtoMapper.js';
export class FetchReferenceDataGateway {
  constructor(http) { this.http = http; }
  async load() {
    const [users, types] = await Promise.all([this.http.json('/users'), this.http.json('/investment-types')]);
    return { users: mapCollectionDto(users), types: mapCollectionDto(types) };
  }
}
