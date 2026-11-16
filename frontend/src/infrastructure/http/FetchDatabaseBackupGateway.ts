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
    if (choices.length && !plans.household) {
      // Validate the entire source before allowing any legacy plan to be discarded.
      await this.previewFile(file);
      if (!selectedPlan) return { choices, needsPlan: true };
    }
    if (selectedPlan) {
      if (!plans[selectedPlan]) throw new Error('Wybierz plan z kopii.');
      document = { ...document, plans: { household: plans[selectedPlan] } };
    }
    const prepared = selectedPlan
      ? new File([JSON.stringify(document)], file.name, { type: 'application/json' })
      : file;
    const preview = await this.previewFile(prepared);
    return {
      ...preview,
      format: Array.isArray(document) ? 'Starsza lista wycen' : `Kopia v${document.formatVersion}`,
      file: prepared
    };
  }
  async previewFile(file) {
    const data = new FormData();
    data.append('file', file);
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
