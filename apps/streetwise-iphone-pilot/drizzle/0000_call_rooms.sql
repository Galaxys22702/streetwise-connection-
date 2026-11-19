CREATE TABLE call_rooms (
  id TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL,
  host_key TEXT NOT NULL,
  guest_key TEXT NOT NULL,
  phase TEXT NOT NULL,
  expires INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  messages TEXT NOT NULL DEFAULT '[]'
);
--> statement-breakpoint
CREATE INDEX call_rooms_expiration ON call_rooms(expires);
--> statement-breakpoint
CREATE INDEX call_rooms_owner ON call_rooms(owner);
