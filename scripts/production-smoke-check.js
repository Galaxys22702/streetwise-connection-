const baseUrl = new URL(
  process.argv[2] || process.env.APP_BASE_URL || "https://streetwise-connection.vercel.app"
);

const expectOpen = process.env.EXPECT_WAITLIST_OPEN === "true";
const failures = [];

function fail(message) {
  failures.push(message);
}

async function getJson(pathname) {
  const url = new URL(pathname, baseUrl);
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`${pathname}_returned_${response.status}`);
  }

  return response.json();
}

try {
  const [health, publicStatus] = await Promise.all([
    getJson("/health"),
    getJson("/api/public-status")
  ]);

  if (health.ok !== true) fail("health_not_ok");
  if (health.service !== "streetwise-connection") fail("unexpected_service_name");
  if (health.publicLaunchMode !== "waitlist") fail("health_not_in_waitlist_mode");
  if (publicStatus.publicLaunchMode !== "waitlist") fail("public_status_not_in_waitlist_mode");

  const healthWaitlistOpen = health.waitlist?.open === true;
  const publicWaitlistOpen = publicStatus.waitlist?.open === true;

  if (healthWaitlistOpen !== publicWaitlistOpen) {
    fail("waitlist_status_mismatch");
  }

  if (healthWaitlistOpen) {
    if (health.database?.configured !== true) fail("open_waitlist_database_not_configured");
    if (health.database?.connected !== true) fail("open_waitlist_database_not_connected");
    if (health.waitlist?.storageConfigured !== true) fail("open_waitlist_storage_not_configured");
    if (!health.waitlist?.supportEmail) fail("open_waitlist_support_email_missing");
  }

  if (expectOpen) {
    if (!healthWaitlistOpen) fail("waitlist_expected_open_but_closed");
    if (health.database?.connected !== true) fail("production_database_not_connected");
  }

  if (failures.length) {
    console.error("Production smoke check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl: baseUrl.origin,
          publicLaunchMode: health.publicLaunchMode,
          waitlistOpen: healthWaitlistOpen,
          databaseConfigured: health.database?.configured === true,
          databaseConnected: health.database?.connected === true
        },
        null,
        2
      )
    );
  }
} catch (error) {
  console.error(`Production smoke check failed: ${error.message}`);
  process.exitCode = 1;
}
