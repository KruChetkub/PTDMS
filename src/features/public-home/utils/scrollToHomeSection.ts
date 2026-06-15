export function scrollToHomeSection(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
