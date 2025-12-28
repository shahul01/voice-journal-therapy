/**
 * Database type definitions for Supabase.
 * Generate this using: npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.ts
 *
 * For now, using a minimal type definition until the actual types are generated.
 */
export type Database = {
	public: {
		Tables: Record<string, unknown>;
		Views: Record<string, unknown>;
		Functions: Record<string, unknown>;
		Enums: Record<string, unknown>;
	};
};
