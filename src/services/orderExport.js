import { buildOrdersCsv, createExportFilename } from '../utils/ordersCsv.js';

export async function prepareOrdersExport(api, { query, selectedIds }, { signal, now } = {}) {
  const ids = [...new Set(selectedIds)];
  const result = ids.length
    ? await api.lookup(ids, { signal })
    : await api.all(
        { tab: query.tab, orderNo: query.orderNo, memberName: query.memberName },
        { signal },
      );
  return {
    csv: buildOrdersCsv(result.items),
    count: result.items.length,
    filename: createExportFilename(now),
    scope: ids.length ? `已勾选 ${ids.length} 笔（含跨页记录）` : '全部筛选结果（含所有分页）',
  };
}
