export function scrollToHomeSection(targetId: string) {
  const matchingSections = Array.from(document.querySelectorAll<HTMLElement>(`[id="${targetId}"]`));
  const visibleSection = matchingSections.find((section) => section.getClientRects().length > 0);
  const targetSection = visibleSection ?? document.getElementById(targetId);

  targetSection?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
