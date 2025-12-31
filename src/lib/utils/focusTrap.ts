/**
 * Focus Trap Utility for Modal Accessibility
 * Ensures keyboard focus stays within modal dialogs
 * Critical for WCAG 2.1 Level A compliance
 */

/**
 * Gets all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const focusableSelectors = [
		'a[href]',
		'button:not([disabled])',
		'textarea:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'[tabindex]:not([tabindex="-1"])'
	].join(', ');

	return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Creates a focus trap for a modal element
 * @param modalElement - The modal DOM element
 * @param options - Configuration options
 * @returns Cleanup function to remove trap
 */
export function createFocusTrap(
	modalElement: HTMLElement,
	options: {
		initialFocus?: HTMLElement;
		returnFocus?: HTMLElement;
		onEscape?: () => void;
	} = {}
): () => void {
	const previouslyFocusedElement = options.returnFocus || (document.activeElement as HTMLElement);

	// Focus the modal or first focusable element
	const focusableElements = getFocusableElements(modalElement);
	const firstFocusable = options.initialFocus || focusableElements[0];
	const lastFocusable = focusableElements[focusableElements.length - 1];

	// Set initial focus
	if (firstFocusable) {
		setTimeout(() => firstFocusable.focus(), 0);
	}

	/**
	 * Handle tab key to trap focus within modal
	 */
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && options.onEscape) {
			e.preventDefault();
			options.onEscape();
			return;
		}

		if (e.key !== 'Tab') return;

		const focusableElements = getFocusableElements(modalElement);
		const firstFocusable = focusableElements[0];
		const lastFocusable = focusableElements[focusableElements.length - 1];

		// Shift + Tab: Move to last element if at first
		if (e.shiftKey && document.activeElement === firstFocusable) {
			e.preventDefault();
			lastFocusable?.focus();
			return;
		}

		// Tab: Move to first element if at last
		if (!e.shiftKey && document.activeElement === lastFocusable) {
			e.preventDefault();
			firstFocusable?.focus();
			return;
		}
	}

	// Add event listener
	modalElement.addEventListener('keydown', handleKeyDown);

	// Return cleanup function
	return () => {
		modalElement.removeEventListener('keydown', handleKeyDown);

		// Return focus to previously focused element
		if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
			previouslyFocusedElement.focus();
		}
	};
}

