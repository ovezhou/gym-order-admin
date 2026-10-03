import { isValidYears } from './orders.js';

export function normalizeNewOrder(values) {
  return {
    memberName: typeof values.memberName === 'string' ? values.memberName.trim() : '',
    phone: typeof values.phone === 'string' ? values.phone.trim() : '',
    years: values.years,
    remark: values.remark ?? '',
  };
}

export function getNewOrderErrors(values) {
  const { memberName, phone, years, remark } = normalizeNewOrder(values);
  const fields = {};
  const nameLength = [...memberName].length;
  if (!memberName) fields.memberName = '请输入会员姓名';
  else if (nameLength < 2 || nameLength > 30) fields.memberName = '会员姓名必须为 2～30 个字符';
  if (!phone) fields.phone = '请输入联系手机号';
  else if (!/^1[3-9]\d{9}$/.test(phone)) fields.phone = '请输入有效的中国大陆手机号';
  if (years == null) fields.years = '请输入购卡年限';
  else if (!isValidYears(years)) fields.years = '购卡年限必须为 1～10 的整数';
  if (typeof remark !== 'string' || [...remark].length > 200) fields.remark = '备注最多 200 个字符';
  return fields;
}
