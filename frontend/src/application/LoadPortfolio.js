export class LoadPortfolio {
  constructor(entries) { this.entries = entries; }
  execute({ owners, filters = {} }) {
    return Promise.all(owners.map((owner) => this.entries.findAll({ owner, ...filters })))
      .then((groups) => groups.flat());
  }
}
