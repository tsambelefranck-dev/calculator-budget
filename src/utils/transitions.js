// Enrobe un rendu avec la View Transition API quand le navigateur la supporte
// (transition douce native), sinon exécute le rendu directement — l'animation
// CSS de secours (animations.css) prend le relais via la classe .screen.
export function withViewTransition(renderFn) {
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(renderFn);
  } else {
    renderFn();
  }
}
