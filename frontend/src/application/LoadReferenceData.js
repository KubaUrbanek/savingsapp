export class LoadReferenceData {
  constructor(referenceData) { this.referenceData = referenceData; }
  execute() { return this.referenceData.load(); }
}
