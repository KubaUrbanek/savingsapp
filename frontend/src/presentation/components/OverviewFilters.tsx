import React from 'react';
import type { OverviewGrouping } from '../../domain/portfolio/overviewVisualization.js';
import { overviewGroupLabel, overviewGroupStyle } from '../viewModels/overviewVisualization.js';
import { formatMoney } from '../viewModels/formatters.js';
import { Button } from './Button.js';

type OverviewFiltersProps = {
  grouping: OverviewGrouping;
  groups: string[];
  values?: Record<string, number>;
  excludedGroups: string[];
  onGroupingChange: (grouping: OverviewGrouping) => void;
  onExcludedGroupsChange: (excludedGroups: string[]) => void;
};

export function OverviewFilters({
  grouping,
  groups,
  values = {},
  excludedGroups,
  onGroupingChange,
  onExcludedGroupsChange
}: OverviewFiltersProps) {
  const descriptionId = React.useId();
  const selectedCount = groups.filter((key) => !excludedGroups.includes(key)).length;
  return (
    <div className="overviewSelection">
      <div className="overviewGrouping" role="group" aria-label="Podział oszczędności">
        <Button variant="quiet" aria-pressed={grouping === 'accounts'} onClick={() => onGroupingChange('accounts')}>
          Według kont i produktów
        </Button>
        <Button
          variant="quiet"
          aria-pressed={grouping === 'assetClasses'}
          onClick={() => onGroupingChange('assetClasses')}
        >
          Według rodzaju inwestycji
        </Button>
      </div>
      <p>{grouping === 'accounts' ? 'Gdzie trzymasz pieniądze' : 'W co są zainwestowane'}</p>
      <fieldset className="overviewGroupOptions" aria-describedby={descriptionId}>
        <legend>{grouping === 'accounts' ? 'Wybierz konta i produkty' : 'Wybierz rodzaje aktywów'}</legend>
        <div className="overviewCheckboxes">
          {groups.map((key) => (
            <label className="overviewCheckbox" key={key}>
              <input
                type="checkbox"
                checked={!excludedGroups.includes(key)}
                onChange={(event) =>
                  onExcludedGroupsChange(
                    event.target.checked ? excludedGroups.filter((value) => value !== key) : [...excludedGroups, key]
                  )
                }
              />
              <span
                className="overviewColor"
                style={{ background: overviewGroupStyle(key).color }}
                aria-hidden="true"
              />
              {overviewGroupLabel(key, grouping)} {values[key] != null && <small>{formatMoney(values[key])}</small>}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="overviewSelectionActions">
        <Button variant="quiet" disabled={selectedCount === groups.length} onClick={() => onExcludedGroupsChange([])}>
          Pokaż wszystkie
        </Button>
        <Button variant="quiet" disabled={selectedCount === 0} onClick={() => onExcludedGroupsChange([...groups])}>
          Odznacz wszystkie
        </Button>
      </div>
      <p id={descriptionId} className="overviewHint" aria-live="polite">
        Wybrano {selectedCount} z {groups.length} grup. Wybór dotyczy całego Przeglądu.
      </p>
    </div>
  );
}
