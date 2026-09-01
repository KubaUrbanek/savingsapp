// @ts-nocheck
export class FetchDatabaseBackupGateway {
  constructor(http) {
    this.http = http;
  }
  export() {
    return this.http.blob('/database/export');
  }
  import(file) {
    const data = new FormData();
    data.append('file', file);
    return this.http.multipart('/database/import', data);
  }
}
