export function createOrderListState() {
  return {
    query: { tab: 'all', orderNo: '', memberName: '', page: 1, pageSize: 10 },
    items: [],
    total: 0,
    loading: true,
    error: null,
  };
}

function startQuery(state, query) {
  return { ...state, query, items: [], total: 0, loading: true, error: null };
}

export function orderListReducer(state, action) {
  switch (action.type) {
    case 'tab':
      return startQuery(state, { ...state.query, tab: action.tab, page: 1 });
    case 'search':
      return startQuery(state, {
        ...state.query,
        orderNo: (action.values.orderNo ?? '').trim(),
        memberName: (action.values.memberName ?? '').trim(),
        page: 1,
      });
    case 'reset':
      return startQuery(state, { ...state.query, orderNo: '', memberName: '', page: 1 });
    case 'page':
      return startQuery(state, {
        ...state.query,
        page: action.pageSize !== state.query.pageSize ? 1 : action.page,
        pageSize: action.pageSize,
      });
    case 'refresh':
      return startQuery(state, { ...state.query });
    case 'success': {
      // Reject stale responses even before the previous effect cleanup has run.
      if (action.query !== state.query) return state;
      const lastPage = Math.max(1, Math.ceil(action.result.total / state.query.pageSize));
      if (state.query.page > lastPage) return startQuery(state, { ...state.query, page: lastPage });
      return {
        ...state,
        items: action.result.items,
        total: action.result.total,
        loading: false,
        error: null,
      };
    }
    case 'failure':
      if (action.query !== state.query) return state;
      return { ...state, items: [], total: 0, loading: false, error: action.message };
    default:
      return state;
  }
}
