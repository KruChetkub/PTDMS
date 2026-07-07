export function formatSpdServiceTicketNo(ticketNo: string | null | undefined) {
  const normalized = ticketNo?.trim();

  if (!normalized) {
    return '-';
  }

  const christianEraMatch = normalized.match(/^(?:SPD|DSP)-([A-Z]+)-(\d{4})(\d{2})(\d{2})-(\d+)$/);

  if (christianEraMatch) {
    const [, categoryCode, year, month, day, sequenceNo] = christianEraMatch;
    const buddhistYear = Number(year) + 543;
    return `DSP-${categoryCode}-${day}${month}${buddhistYear}-${sequenceNo}`;
  }

  const buddhistEraMatch = normalized.match(/^(?:SPD|DSP)-([A-Z]+)-(\d{2})(\d{2})(\d{4})-(\d+)$/);

  if (buddhistEraMatch) {
    return normalized.replace(/^SPD-/, 'DSP-');
  }

  return normalized.replace(/^SPD-/, 'DSP-');
}