<script lang="ts">
	import { onMount } from 'svelte';
	import { crisisModalOpen, closeCrisisModal } from '$lib/stores/crisisModal';
	import { getPrimaryHotlines, detectUserCountry, type CrisisHotline } from '$lib/data/crisisHotlines';
	import { browser } from '$app/environment';

	let isOpen = $state(false);
	let hotlines = $state<CrisisHotline[]>([]);
	let userCountry = $state<string>('US');
	let copiedNumber = $state<string | null>(null);

	onMount(() => {
		if (browser) {
			userCountry = detectUserCountry();
			hotlines = getPrimaryHotlines(userCountry);
		}

		// Subscribe to modal state
		const unsubscribe = crisisModalOpen.subscribe((open) => {
			isOpen = open;
			if (open) {
				// Prevent body scroll when modal is open
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		});

		return () => {
			unsubscribe();
			document.body.style.overflow = '';
		};
	});

	function handleClose() {
		closeCrisisModal();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			handleClose();
		}
	}

	async function copyToClipboard(text: string, id: string) {
		if (!browser) return;

		try {
			await navigator.clipboard.writeText(text);
			copiedNumber = id;

			// Reset after 2 seconds
			setTimeout(() => {
				copiedNumber = null;
			}, 2000);
		} catch (err) {
			console.error('[CrisisModal] Failed to copy:', err);
		}
	}

	function getCallLink(phone?: string): string {
		if (!phone) return '#';
		// Remove any non-digit characters except + for international numbers
		const cleanPhone = phone.replace(/[^\d+]/g, '');
		return `tel:${cleanPhone}`;
	}

	function getTextLink(phone?: string, textCode?: string): string {
		if (!phone && !textCode) return '#';
		const number = phone || textCode || '';
		const cleanNumber = number.replace(/[^\d]/g, '');
		const body = textCode ? `&body=${textCode}` : '';
		return `sms:${cleanNumber}${body}`;
	}

	function hasPhone(hotline: CrisisHotline): boolean {
		return !!hotline.phone;
	}

	function hasText(hotline: CrisisHotline): boolean {
		return !!(hotline.text || hotline.textCode);
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={handleClose}
		onkeydown={handleKeydown}
		role="presentation"
		aria-hidden="true"
	></div>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="modal-header">
			<h2 id="modal-title">You're Not Alone - Immediate Help Available</h2>
			<button
				type="button"
				class="close-button"
				onclick={handleClose}
				aria-label="Close modal"
			>
				×
			</button>
		</div>

		<div class="modal-body">
			<p class="intro-text">
				If you're in crisis, help is available right now. These services are free, confidential,
				and available 24/7.
			</p>

			<div class="hotlines-list">
				{#each hotlines as hotline (hotline.id)}
					<div class="hotline-card">
						<div class="hotline-header">
							<h3 class="hotline-name">{hotline.name}</h3>
							{#if hotline.available}
								<span class="availability-badge">{hotline.available}</span>
							{/if}
						</div>

						{#if hotline.description}
							<p class="hotline-description">{hotline.description}</p>
						{/if}

						<div class="hotline-actions">
							<div class="action-row primary-actions">
								{#if hasPhone(hotline)}
									<a
										href={getCallLink(hotline.phone)}
										class="action-button call-button"
										aria-label="Call {hotline.name} at {hotline.phone}"
									>
										<span class="button-icon">📞</span>
										<span class="button-text">Call {hotline.phone}</span>
									</a>
								{/if}

								{#if hasText(hotline)}
									<a
										href={getTextLink(hotline.text || '', hotline.textCode)}
										class="action-button text-button"
										aria-label="Text {hotline.name}"
									>
										<span class="button-icon">💬</span>
										<span class="button-text">
											Text {hotline.text || hotline.textCode}
											{#if hotline.textCode}
												{' '}({hotline.textCode})
											{/if}
										</span>
									</a>
								{/if}
							</div>

							<div class="action-row secondary-actions">
								{#if hasPhone(hotline)}
									<button
										type="button"
										class="action-button copy-button"
										onclick={() => hotline.phone && copyToClipboard(hotline.phone, hotline.id)}
										aria-label="Copy {hotline.phone} to clipboard"
									>
										<span class="button-icon">
											{copiedNumber === hotline.id ? '✓' : '📋'}
										</span>
										<span class="button-text">
											{copiedNumber === hotline.id ? 'Copied!' : 'Copy Number'}
										</span>
									</button>
								{/if}

								{#if hotline.url}
									<a
										href={hotline.url}
										target="_blank"
										rel="noopener noreferrer"
										class="action-button link-button"
										aria-label="Visit {hotline.name} website"
									>
										<span class="button-icon">🌐</span>
										<span class="button-text">Learn More</span>
									</a>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<div class="footer-note">
				<p>
					<strong>Remember:</strong> You matter, and help is available. If you're in immediate
					danger, call your local emergency number (911 in US, 999 in UK, 000 in Australia).
				</p>
			</div>

			<div class="find-more-resources">
				<p class="find-more-text">
					Need a different type of support or helpline in your area?
				</p>
				<a
					href="https://findahelpline.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="find-helpline-link"
					aria-label="Find additional helplines and support resources"
				>
					<span class="link-icon">🔍</span>
					<span class="link-text">Find A Helpline - Global Directory</span>
					<span class="link-arrow">→</span>
				</a>
				<p class="find-more-description">
					Search 130+ countries for specialized support including domestic violence, LGBTQ+,
					youth services, and more.
				</p>
			</div>
		</div>

		<div class="modal-footer">
			<button
				type="button"
				class="close-footer-button"
				onclick={handleClose}
				aria-label="I'm safe, close crisis hotlines modal"
			>
				I'm Safe - Close
			</button>
		</div>
	</div>
{/if}

<style lang="postcss">
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 9998;
		backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: hsl(220, 20%, 98%);
		border-radius: 1.5rem;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
		z-index: 9999;
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slideUp 0.3s ease;
	}

	.dark .modal {
		background: hsl(220, 15%, 15%);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translate(-50%, -40%);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%);
		}
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid hsl(220, 20%, 85%);
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.dark .modal-header {
		border-bottom-color: hsl(220, 20%, 35%);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(220, 30%, 20%);
		line-height: 1.3;
	}

	.dark .modal-header h2 {
		color: hsl(220, 20%, 85%);
	}

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		line-height: 1;
		color: hsl(220, 20%, 60%);
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.close-button:hover {
		background: hsl(220, 20%, 90%);
		color: hsl(220, 30%, 20%);
	}

	.dark .close-button:hover {
		background: hsl(220, 20%, 25%);
		color: hsl(220, 20%, 85%);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.intro-text {
		color: hsl(220, 20%, 40%);
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
		font-size: 0.95rem;
	}

	.dark .intro-text {
		color: hsl(220, 20%, 70%);
	}

	.hotlines-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.hotline-card {
		background: hsl(220, 20%, 95%);
		border-radius: 1rem;
		padding: 1.25rem;
		border: 1px solid hsl(220, 20%, 85%);
		transition: all 0.2s;
	}

	.dark .hotline-card {
		background: hsl(220, 15%, 20%);
		border-color: hsl(220, 20%, 35%);
	}

	.hotline-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.hotline-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.hotline-name {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: hsl(220, 30%, 20%);
		line-height: 1.3;
	}

	.dark .hotline-name {
		color: hsl(220, 20%, 85%);
	}

	.availability-badge {
		background: hsl(120, 50%, 90%);
		color: hsl(120, 50%, 30%);
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.dark .availability-badge {
		background: hsl(120, 40%, 25%);
		color: hsl(120, 50%, 75%);
	}

	.hotline-description {
		color: hsl(220, 20%, 50%);
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 1rem 0;
	}

	.dark .hotline-description {
		color: hsl(220, 20%, 65%);
	}

	.hotline-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.primary-actions {
		/* Call and SMS buttons row */
	}

	.secondary-actions {
		/* Copy and Learn More buttons row */
	}

	.action-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		font-size: 0.9rem;
		font-weight: 500;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
		min-height: 48px;
		flex: 1;
		min-width: 120px;
		justify-content: center;
	}

	.button-icon {
		font-size: 1.2rem;
		flex-shrink: 0;
	}

	.button-text {
		white-space: nowrap;
	}

	.call-button {
		background: hsl(120, 50%, 50%);
		color: white;
	}

	.call-button:hover {
		background: hsl(120, 50%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.text-button {
		background: hsl(200, 60%, 50%);
		color: white;
	}

	.text-button:hover {
		background: hsl(200, 60%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.copy-button {
		background: hsl(220, 30%, 85%);
		color: hsl(220, 30%, 20%);
	}

	.copy-button:hover {
		background: hsl(220, 30%, 80%);
	}

	.dark .copy-button {
		background: hsl(220, 20%, 30%);
		color: hsl(220, 20%, 85%);
	}

	.dark .copy-button:hover {
		background: hsl(220, 20%, 35%);
	}

	.link-button {
		background: hsl(45, 50%, 85%);
		color: hsl(45, 60%, 30%);
	}

	.link-button:hover {
		background: hsl(45, 50%, 80%);
	}

	.dark .link-button {
		background: hsl(45, 40%, 25%);
		color: hsl(45, 60%, 70%);
	}

	.dark .link-button:hover {
		background: hsl(45, 40%, 30%);
	}

	.footer-note {
		padding: 1rem;
		background: hsl(45, 40%, 95%);
		border: 1px solid hsl(45, 40%, 80%);
		border-radius: 0.75rem;
		margin-top: 1rem;
	}

	.dark .footer-note {
		background: hsl(45, 30%, 20%);
		border-color: hsl(45, 40%, 40%);
	}

	.footer-note p {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.5;
		color: hsl(45, 60%, 30%);
	}

	.dark .footer-note p {
		color: hsl(45, 60%, 70%);
	}

	.find-more-resources {
		margin-top: 1.5rem;
		padding: 1.25rem;
		background: hsl(220, 30%, 95%);
		border: 1px solid hsl(220, 30%, 85%);
		border-radius: 0.75rem;
		text-align: center;
	}

	.dark .find-more-resources {
		background: hsl(220, 20%, 22%);
		border-color: hsl(220, 30%, 35%);
	}

	.find-more-text {
		margin: 0 0 0.75rem 0;
		font-size: 0.9rem;
		color: hsl(220, 20%, 40%);
		font-weight: 500;
	}

	.dark .find-more-text {
		color: hsl(220, 20%, 70%);
	}

	.find-helpline-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: hsl(220, 50%, 50%);
		color: white;
		text-decoration: none;
		border-radius: 0.75rem;
		font-weight: 600;
		font-size: 0.95rem;
		transition: all 0.2s;
		margin-bottom: 0.5rem;
		min-height: 48px;
	}

	.find-helpline-link:hover {
		background: hsl(220, 50%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.find-helpline-link:active {
		transform: translateY(0);
	}

	.link-icon {
		font-size: 1.1rem;
	}

	.link-text {
		white-space: nowrap;
	}

	.link-arrow {
		font-size: 1.2rem;
		transition: transform 0.2s;
	}

	.find-helpline-link:hover .link-arrow {
		transform: translateX(4px);
	}

	.find-more-description {
		margin: 0.75rem 0 0 0;
		font-size: 0.8rem;
		color: hsl(220, 20%, 50%);
		line-height: 1.4;
	}

	.dark .find-more-description {
		color: hsl(220, 20%, 65%);
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid hsl(220, 20%, 85%);
		display: flex;
		justify-content: center;
	}

	.dark .modal-footer {
		border-top-color: hsl(220, 20%, 35%);
	}

	.close-footer-button {
		padding: 0.75rem 2rem;
		background: hsl(220, 30%, 85%);
		color: hsl(220, 30%, 20%);
		border: none;
		border-radius: 0.75rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-footer-button:hover {
		background: hsl(220, 30%, 80%);
		transform: translateY(-1px);
	}

	.dark .close-footer-button {
		background: hsl(220, 20%, 30%);
		color: hsl(220, 20%, 85%);
	}

	.dark .close-footer-button:hover {
		background: hsl(220, 20%, 35%);
	}

	@media (max-width: 640px) {
		.modal {
			width: 95%;
			max-height: 95vh;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: 1rem;
		}

		.modal-header h2 {
			font-size: 1.25rem;
		}

		.hotline-actions {
			gap: 0.5rem;
		}

		.action-row {
			flex-direction: column;
			gap: 0.5rem;
		}

		.action-button {
			width: 100%;
			min-width: unset;
		}

		.hotline-header {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>

