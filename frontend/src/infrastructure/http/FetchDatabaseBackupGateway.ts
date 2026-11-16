// @ts-nocheck
export class FetchDatabaseBackupGateway {
  constructor(http) {
    this.http = http;
  }
  async inspect(file, selectedPlan) {
    let document;
    try {
      document = JSON.parse(await file.text());
    } catch {
      throw new Error('Plik nie zawiera poprawnego JSON.');
    }
    if (!Array.isArray(document) && (!document || ![1, 2].includes(document.formatVersion)))
      throw new Error('Nieobsługiwany format kopii.');
    const plans = Array.isArray(document) ? {} : (document.plans ?? {});
    const choices = Object.keys(plans);
    if (selectedPlan && !plans[selectedPlan]) throw new Error('Wybierz plan z kopii.');
    const preview = await this.previewFile(file, selectedPlan);
    if (choices.length && !plans.household && !selectedPlan) return { choices, needsPlan: true };
    if (typeof preview.preparedDocument !== 'string')
      throw new Error('Nie udało się przygotować kopii. Spróbuj ponownie.');
    // The server encodes exact decimals; never round-trip financial JSON through JavaScript numbers.
    let prepared;
    try {
      prepared = new File(
        [Uint8Array.from(atob(preview.preparedDocument), (character) => character.charCodeAt(0))],
        file.name,
        { type: 'application/json' }
      );
    } catch {
      throw new Error('Serwer zwrócił nieprawidłową kopię. Spróbuj ponownie.');
    }
    return {
      ...preview,
      format: Array.isArray(document) ? 'Starsza lista wycen' : `Kopia v${document.formatVersion}`,
      file: prepared
    };
  }
  async previewFile(file, selectedPlan) {
    const data = new FormData();
    data.append('file', file);
    if (selectedPlan) data.append('selectedPlan', selectedPlan);
    try {
      const preview = await this.http.multipart('/database/preview', data);
      if (
        !preview ||
        !Number.isInteger(preview.entries) ||
        !Number.isInteger(preview.operations) ||
        !Array.isArray(preview.owners) ||
        typeof preview.sharedPlan !== 'boolean'
      )
        throw new Error('Invalid preview');
      return preview;
    } catch (cause) {
      throw new Error(
        cause.status === 400
          ? 'Kopia zawiera nieprawidłowe lub nieobsługiwane dane. Obecne dane pozostają bez zmian.'
          : 'Nie udało się sprawdzić kopii. Sprawdź połączenie i spróbuj ponownie.'
      );
    }
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
