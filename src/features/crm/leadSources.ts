import type { LeadSourceOption } from '@/services/api/lead.service';

// The backend catalog owns labels. Unknown historical values stay verbatim.
export function getLeadSourceLabel(value: string | null | undefined, sources: LeadSourceOption[]) {
  return sources.find(source => source.value === value)?.label || value || '-';
}

export function getEditableLeadSources(sources: LeadSourceOption[], currentValue?: string | null) {
  const options = sources.filter(source => !source.legacy || source.value === currentValue);
  return currentValue && !options.some(source => source.value === currentValue)
    ? [...options, { value: currentValue, label: currentValue, legacy: true }]
    : options;
}
