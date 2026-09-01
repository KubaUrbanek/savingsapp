export class LoadReferenceData {
  constructor(referenceData) { this.referenceData = referenceData; }
  execute({ signal } = {}) { return this.referenceData.load({ signal }); }
}
