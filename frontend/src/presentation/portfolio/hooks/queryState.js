export const idle = () => ({ status: 'idle' });
export const loading = (previousData) => previousData === undefined
  ? { status: 'loading' }
  : { status: 'loading', data: previousData };
export const success = (data) => ({ status: 'success', data });
export const failure = (error) => ({ status: 'failure', error });

export function dataFrom(state, fallback) {
  return state.status === 'success' || (state.status === 'loading' && 'data' in state)
    ? state.data
    : fallback;
}
