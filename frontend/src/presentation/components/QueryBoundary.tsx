import React from 'react';
import { Button } from './Button.jsx';

type SkeletonShape = 'section' | 'chart' | 'list';

function QuerySkeleton({ shape, label }: { shape: SkeletonShape; label: string }) {
  const lines = shape === 'chart' ? 4 : shape === 'list' ? 3 : 2;
  return (
    <div className={`querySkeleton querySkeleton--${shape}`} role="status" aria-label={label}>
      <span className="visuallyHidden">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <span className="querySkeletonLine" key={index} aria-hidden="true" />
      ))}
    </div>
  );
}

type QueryState<Data> =
  | { status: 'idle' | 'loading'; data?: Data }
  | { status: 'success'; data: Data }
  | { status: 'failure'; error: unknown; data?: Data };

type QueryBoundaryProps<Data> = {
  state: QueryState<Data>;
  children: (data: Data) => React.ReactNode;
  isEmpty?: (data: Data) => boolean;
  skeletonShape?: SkeletonShape;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
};

export function QueryBoundary<Data>({
  state,
  children,
  isEmpty = (data) => Array.isArray(data) && data.length === 0,
  skeletonShape = 'section',
  loadingLabel = 'Wczytywanie danych sekcji…',
  emptyTitle = 'Brak danych',
  emptyDescription = undefined,
  emptyAction = undefined,
  onRetry = undefined
}: QueryBoundaryProps<Data>) {
  const hasData = state.status === 'success' || (state.status === 'loading' && 'data' in state);

  if (state.status === 'loading' && !hasData) return <QuerySkeleton shape={skeletonShape} label={loadingLabel} />;

  if (state.status === 'failure') {
    return (
      <div className="queryState queryState--failure" role="alert">
        <strong>Nie udało się wczytać tej sekcji.</strong>
        <p>Twoje dane są bezpieczne. Sprawdź połączenie i spróbuj ponownie.</p>
        <Button variant="secondary" type="button" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (!hasData || state.data === undefined || isEmpty(state.data)) {
    return (
      <div className="queryState queryState--empty">
        <strong>{emptyTitle}</strong>
        {emptyDescription && <p>{emptyDescription}</p>}
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="queryBoundaryContent" aria-busy={state.status === 'loading'}>
      {state.status === 'loading' && (
        <span className="queryRefreshing" role="status">
          Odświeżanie danych…
        </span>
      )}
      {children(state.data)}
    </div>
  );
}
