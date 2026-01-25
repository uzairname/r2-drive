CREATE TABLE "share_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"path_prefix" text NOT NULL,
	"permission" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone
);
