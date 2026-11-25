import { Modal } from 'antd';

// Compare values, not touched flags: undoing an edit must count as unchanged.
export function formSnapshot(values: Record<string, unknown>, unorderedFields: string[] = []) {
  return JSON.stringify(Object.entries(values)
    .filter(([, value]) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => [name, Array.isArray(value) && unorderedFields.includes(name) ? [...value].sort() : value]));
}

export function confirmDiscardChanges(hasChanges: boolean, onDiscard: () => void) {
  if (!hasChanges) { onDiscard(); return; }
  return Modal.confirm({
    title: 'Bỏ thay đổi chưa lưu?',
    content: 'Thay đổi của bạn chưa được lưu.',
    okText: 'Bỏ thay đổi', cancelText: 'Tiếp tục sửa', autoFocusButton: 'cancel',
    onOk: onDiscard,
  });
}
