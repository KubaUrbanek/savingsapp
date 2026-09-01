import React from 'react';
import { failure, idle, loading, success } from './queryState.js';

// Both cancellation and the generation check are intentional: not every use-case
// adapter is necessarily able to cancel its underlying work.
export function useLatestQuery(load, dependencies, { enabled = true } = {}) {
  const [state, setState] = React.useState(idle);
  const generation = React.useRef(0);

  React.useEffect(() => {
    const request = ++generation.current;
    const controller = new AbortController();
    if (!enabled) {
      setState(idle());
      return () => controller.abort();
    }

    // Clear data immediately so a newly selected scope never renders the prior
    // scope while its replacement request is in flight.
    setState(loading());
    Promise.resolve().then(() => load(controller.signal)).then(
      (data) => {
        if (request === generation.current && !controller.signal.aborted) setState(success(data));
      },
      (error) => {
        if (request === generation.current && !controller.signal.aborted && error?.name !== 'AbortError') setState(failure(error));
      }
    );
    return () => controller.abort();
  // The caller supplies the complete semantic dependency list, like useEffect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies]);

  return state;
}
