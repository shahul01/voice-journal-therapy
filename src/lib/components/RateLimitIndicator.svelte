<script lang="ts">
	import { rateLimitState } from '$lib/stores/rateLimitTracker';
	import { get } from 'svelte/store';
	import { onMount, onDestroy } from 'svelte';

	let state = $state(get(rateLimitState));
	let unsubscribe: (() => void) | null = null;
	let intervalId: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		unsubscribe = rateLimitState.subscribe((value) => {
			state = value;
		});

		intervalId = setInterval(() => {
			state = get(rateLimitState);
		}, 5000);
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		if (intervalId) clearInterval(intervalId);
	});

	function formatTimeUntilReset(ms: number): string {
		const hours = Math.floor(ms / (1000 * 60 * 60));
		const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function getUsagePercentage(used: number, limit: number): number {
		return Math.round((used / limit) * 100);
	}

	function getStatusColor(percentage: number): string {
		if (percentage >= 90) return 'hsl(0, 70%, 50%)';
		if (percentage >= 80) return 'hsl(30, 70%, 50%)';
		return 'hsl(120, 50%, 50%)';
	}

	const rpdPercentage = getUsagePercentage(state.rpd.used, state.rpd.limit);
	const showWarning = rpdPercentage >= 80;
</script>

{#if showWarning || state.isLimited}
	<div class="rate-limit-indicator" class:limited={state.isLimited}>
		<div class="indicator-header">
			<span class="indicator-icon">⚠️</span>
			<span class="indicator-title">
				{state.isLimited ? 'Rate Limit Reached' : 'Rate Limit Warning'}
			</span>
		</div>
		<div class="indicator-content">
			<div class="quota-item">
				<span class="quota-label">Daily Requests:</span>
				<span
					class="quota-value"
					style="color: {getStatusColor(rpdPercentage)}"
				>
					{state.rpd.used} / {state.rpd.limit}
				</span>
			</div>
			{#if state.isLimited && state.rpd.remaining === 0}
				<div class="reset-info">
					Resets in {formatTimeUntilReset(state.rpd.msUntilReset)}
				</div>
			{:else if showWarning}
				<div class="warning-info">
					{100 - rpdPercentage}% remaining today
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="postcss">
	.rate-limit-indicator {
		background: hsl(45, 90%, 95%);
		border: 1px solid hsl(45, 70%, 70%);
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.dark .rate-limit-indicator {
		background: hsl(45, 50%, 20%);
		border-color: hsl(45, 60%, 40%);
	}

	.rate-limit-indicator.limited {
		background: hsl(0, 90%, 95%);
		border-color: hsl(0, 70%, 70%);
	}

	.dark .rate-limit-indicator.limited {
		background: hsl(0, 50%, 20%);
		border-color: hsl(0, 60%, 40%);
	}

	.indicator-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
		font-size: 0.9rem;
		color: hsl(220, 30%, 20%);
	}

	.dark .indicator-header {
		color: hsl(220, 20%, 85%);
	}

	.indicator-icon {
		font-size: 1.1rem;
	}

	.indicator-content {
		font-size: 0.85rem;
		color: hsl(220, 20%, 40%);
	}

	.dark .indicator-content {
		color: hsl(220, 20%, 70%);
	}

	.quota-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.quota-label {
		font-weight: 500;
	}

	.quota-value {
		font-weight: 600;
	}

	.reset-info,
	.warning-info {
		margin-top: 0.5rem;
		font-size: 0.8rem;
		font-style: italic;
	}

	@media (max-width: 640px) {
		.rate-limit-indicator {
			padding: 0.6rem 0.8rem;
			font-size: 0.85rem;
		}
	}
</style>