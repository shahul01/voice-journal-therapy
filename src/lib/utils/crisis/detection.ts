import { GOOGLE_GEMINI_API_KEY } from '$env/static/private';
import { prompts } from '$lib/data';
import type { CrisisDetectionResult, CrisisLevel } from '$lib/types/crisis';
import type { ConversationMessage } from '$lib/types/conversation';

const CRISIS_DETECTION_PROMPT = prompts.v0.crisis[0].prompt;

interface GeminiResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
}

/**
 * Detects crisis level from conversation messages using Gemini AI
 */
export async function detectCrisisLevel(
	messages: ConversationMessage[]
): Promise<CrisisDetectionResult> {
	try {
		if (!GOOGLE_GEMINI_API_KEY) {
			console.error('[CrisisDetection] Gemini API key not configured');
			return createSafeDefaultResult();
		}

		// Get recent messages (last 10 for context)
		const recentMessages = messages.slice(-10);
		const conversationText = recentMessages
			.map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
			.join('\n');

		const requestBody = {
			contents: [
				{
					role: 'user',
					parts: [
						{
							text: `${CRISIS_DETECTION_PROMPT}\n\nCONVERSATION:\n${conversationText}\n\nANALYSIS (JSON only):`
						}
					]
				}
			],
			generationConfig: {
				temperature: 0.3,
				topK: 20,
				topP: 0.8,
				maxOutputTokens: 512
			},
			safetySettings: [
				{
					category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
					threshold: 'BLOCK_NONE'
				},
				{
					category: 'HARM_CATEGORY_HARASSMENT',
					threshold: 'BLOCK_NONE'
				},
				{
					category: 'HARM_CATEGORY_HATE_SPEECH',
					threshold: 'BLOCK_NONE'
				},
				{
					category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
					threshold: 'BLOCK_NONE'
				}
			]
		};

		console.log('[CrisisDetection] Sending request to Gemini...');

		const modelName = 'gemini-2.5-flash';
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			}
		);

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText);
			console.error('[CrisisDetection] API error:', errorText);
			return createSafeDefaultResult();
		}

		const result: GeminiResponse = await response.json();
		const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

		console.log('[CrisisDetection] Raw response:', text);

		// Extract JSON from response (may contain markdown code blocks)
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			console.error('[CrisisDetection] No JSON found in response');
			return createSafeDefaultResult();
		}

		const detectionResult: CrisisDetectionResult = JSON.parse(jsonMatch[0]);

		// Validate and sanitize result
		const validated = validateDetectionResult(detectionResult);

		// Fallback: Use quick pattern check if AI returned level 0 but patterns suggest higher
		const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0];
		if (lastUserMessage && validated.level === 0) {
			const quickCheck = quickPatternCheck(lastUserMessage.text);
			if (quickCheck > 0) {
				console.log('[CrisisDetection] Quick pattern check found level', quickCheck, '(AI said 0)');
				return {
					level: quickCheck,
					confidence: 0.75,
					indicators: [lastUserMessage.text.substring(0, 100)],
					reasoning: 'Pattern-based detection (AI returned level 0)',
					detectedPatterns: ['quick-pattern-match']
				};
			}
		}

		console.log('[CrisisDetection] Detected level:', validated.level, {
			confidence: validated.confidence,
			indicators: validated.indicators,
			patterns: validated.detectedPatterns
		});

		return validated;
	} catch (err) {
		console.error('[CrisisDetection] Error:', err);
		return createSafeDefaultResult();
	}
}

/**
 * Creates a safe default result (level 0 with low confidence)
 */
function createSafeDefaultResult(): CrisisDetectionResult {
	return {
		level: 0,
		confidence: 0.5,
		indicators: [],
		reasoning: 'Unable to perform crisis detection - defaulting to safe level',
		detectedPatterns: []
	};
}

/**
 * Validates and sanitizes detection result
 */
function validateDetectionResult(result: any): CrisisDetectionResult {
	// Validate level (0-4)
	let level: CrisisLevel = 0;
	if (typeof result.level === 'number' && result.level >= 0 && result.level <= 4) {
		level = Math.round(result.level) as CrisisLevel;
	}

	// Validate confidence (0-1)
	let confidence = 0.5;
	if (typeof result.confidence === 'number') {
		confidence = Math.max(0, Math.min(1, result.confidence));
	}

	// Validate arrays
	const indicators = Array.isArray(result.indicators) ? result.indicators : [];
	const detectedPatterns = Array.isArray(result.detectedPatterns) ? result.detectedPatterns : [];

	// Validate reasoning
	const reasoning =
		typeof result.reasoning === 'string' ? result.reasoning : 'No reasoning provided';

	return {
		level,
		confidence,
		indicators,
		reasoning,
		detectedPatterns
	};
}

/**
 * Quick local pattern matching for immediate risk keywords (backup/supplement to AI)
 */
export function quickPatternCheck(text: string): CrisisLevel {
	const lowerText = text.toLowerCase();

	// Level 4 patterns: Imminent risk with specifics
	const level4Patterns = [
		/tonight.*(kill|suicide|end|die)/i,
		/tomorrow.*(kill|suicide|end|die)/i,
		/(got|have|bought).*(pills|gun|rope|knife).*(end|kill|suicide)/i,
		/specific (plan|method|way).*(suicide|kill myself|end)/i,
		/goodbye.*(kill|suicide|die|end)/i,
		/(plan|planning).*(suicide|kill myself|end my life)/i
	];

	// Level 3 patterns: Intent expressed (MOST IMPORTANT)
	const level3Patterns = [
		/suicidal (intention|intent)/i,
		/have suicidal/i,
		/(will|going to|want to).*(kill myself|commit suicide|end my life)/i,
		/i (will|am going to|want to) (die|suicide)/i,
		/preparing to (die|kill|suicide)/i,
		/(decided|planning) to (die|kill myself|end)/i,
		/can't (take|do|handle) (it|this|anymore).*(die|kill|end)/i
	];

	// Level 2 patterns: Method mentions
	const level2Patterns = [
		/(thinking about|considering|researching).*(ways to|how to).*(die|suicide|kill)/i,
		/(pills|overdose|hanging|jumping|weapon).*(thoughts|ideation)/i,
		/suicide.*(method|way)/i,
		/how (to|do i).*(die|kill myself|suicide)/i
	];

	// Level 1 patterns: Passive ideation
	const level1Patterns = [
		/(wish|want).*(die|death|not (exist|alive|here))/i,
		/better off dead/i,
		/(life|living).*(meaningless|pointless|not worth)/i,
		/suicidal (thought|thinking)/i,
		/don't want to (live|exist|be here)/i,
		/hopeless/i
	];

	for (const pattern of level4Patterns) {
		if (pattern.test(lowerText)) return 4;
	}

	for (const pattern of level3Patterns) {
		if (pattern.test(lowerText)) return 3;
	}

	for (const pattern of level2Patterns) {
		if (pattern.test(lowerText)) return 2;
	}

	for (const pattern of level1Patterns) {
		if (pattern.test(lowerText)) return 1;
	}

	return 0;
}
