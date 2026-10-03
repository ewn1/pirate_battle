/** [E2E: RANKING & HISTORY] Pagination, states, failures, registration, recovery. */
import { expect, openLog, runtimeQuery, test } from "./helpers/fixtures";
import { playAndLose } from "./helpers/matches";

const EXPECTED_ERRORS = [
  /Failed to load resource|net::ERR|status of 4|status of 5|timeout|Network Error/i,
];

test.describe("Ranking", () => {
  test("shows page 1 of 3, paginates and keeps the controls consistent", async ({
    page,
  }) => {
    await openLog(page, "ranking");
    await expect(page.getByTestId("ranking-row")).toHaveCount(5);
    await expect(page.getByTestId("page-indicator")).toContainText("1");
    await expect(page.getByTestId("page-prev")).toBeDisabled();

    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toContainText("2");
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toContainText("3");
    await expect(page.getByTestId("page-next")).toBeDisabled();
    await expect(page.getByTestId("ranking-row")).toHaveCount(2);
  });

  test("shows the empty state", async ({ page }) => {
    await page.goto(`/log?tab=ranking&${runtimeQuery({ scenario: "empty" })}`);
    await expect(page.getByTestId("log-empty")).toBeVisible();
  });

  test("shows the loading state on a slow network", async ({ page }) => {
    await page.goto(
      `/log?tab=ranking&${runtimeQuery({ scenario: "slow", latencyScale: 1 })}`,
    );
    await expect(page.getByTestId("log-loading")).toBeVisible();
  });

  test("never lets a late response overwrite a newer page (out of order)", async ({
    page,
  }) => {
    await page.goto(
      `/log?tab=ranking&${runtimeQuery({ scenario: "out-of-order", latencyScale: 1 })}`,
    );
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toContainText("2");
    await page.waitForTimeout(2500); // page 1's slow response arrives now
    await expect(page.getByTestId("page-indicator")).toContainText("2");
    await expect(page.getByTestId("ranking-row").first()).toBeVisible();
  });

  for (const scenario of [
    "http-5xx",
    "http-4xx",
    "network-error",
    "timeout",
    "ranking-fails",
  ]) {
    test.describe(`failure: ${scenario}`, () => {
      test.use({ allowedConsole: EXPECTED_ERRORS });

      test("shows an error and recovers with Retry", async ({ page }) => {
        await page.goto(`/log?tab=ranking&${runtimeQuery({ scenario })}`);
        await expect(page.getByTestId("log-error")).toBeVisible({
          timeout: 15_000,
        });
        // Switch the scenario WITHOUT invalidating queries, so the error stays
        // on screen and the user-facing Retry button is what recovers.
        await page.evaluate(() =>
          localStorage.setItem("pirate-battle:scenario", "success"),
        );
        await page.getByTestId("log-retry").click();
        await expect(page.getByTestId("ranking-row").first()).toBeVisible();
      });
    });
  }
});

test.describe("History", () => {
  test.use({ allowedConsole: EXPECTED_ERRORS });

  test("is empty for a new player", async ({ page }) => {
    await page.goto(`/log?tab=history&${runtimeQuery()}`);
    await expect(page.getByTestId("log-empty")).toBeVisible();
  });

  test("history-fails affects only the history tab", async ({ page }) => {
    await page.goto(
      `/log?tab=ranking&${runtimeQuery({ scenario: "history-fails" })}`,
    );
    await expect(page.getByTestId("ranking-row").first()).toBeVisible();
    await page.getByTestId("tab-history").click();
    await expect(page.getByTestId("log-error")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("many-pages paginates the history", async ({ page }) => {
    await page.goto(
      `/log?tab=history&${runtimeQuery({ scenario: "many-pages" })}`,
    );
    await expect(page.getByTestId("history-row")).toHaveCount(5);
    await page.getByTestId("page-next").click();
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toContainText("3");
  });
});

test.describe("Registration", () => {
  test("a finished match appears in both Ranking and History", async ({
    page,
  }) => {
    await page.goto(`/?${runtimeQuery({ manual: 1, seed: 7 })}`);
    await playAndLose(page);
    await expect(page.getByTestId("registration-status")).toHaveAttribute(
      "data-status",
      "saved",
    );
    await page.getByTestId("main-menu").click();
    await page.getByTestId("history-button").click();
    await expect(page.getByTestId("history-row")).toHaveCount(1);
    await page.getByTestId("tab-ranking").click();
    // A match without kills ranks last: 12 fixtures + this one => page 3.
    await expect(page.getByTestId("ranking-row").first()).toBeVisible();
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toContainText("2");
    await page.getByTestId("page-next").click();
    await expect(page.getByTestId("page-indicator")).toContainText("3");
    await expect(page.locator('tr[data-mine="true"]')).toHaveCount(1);
  });

  test("POST is idempotent: the same id is stored once", async ({ page }) => {
    await page.goto(`/log?tab=history&${runtimeQuery()}`);
    // The mock worker starts asynchronously: wait for the UI (rendered after it) before calling the API.
    await expect(page.getByTestId("log-empty")).toBeVisible();
    const record = {
      id: "idem-1",
      playerId: "idem-player",
      playerName: "Idem",
      score: 3,
      durationSeconds: 90,
      reason: "time_expired",
      playedAt: new Date().toISOString(),
      config: { sessionTimeSec: 90, spawnIntervalMs: 3000 },
    };
    const results = await page.evaluate(async (body) => {
      const post = () =>
        fetch("/api/history", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) => r.json());
      return [await post(), await post()];
    }, record);
    expect(results[0].duplicate).toBe(false);
    expect(results[1].duplicate).toBe(true);
  });

  test.describe("timeout after the server stored the record", () => {
    test.use({ allowedConsole: EXPECTED_ERRORS });

    test("the retry recovers without duplicating", async ({ page }) => {
      await page.goto(
        `/?${runtimeQuery({ manual: 1, seed: 7, scenario: "timeout-after-register" })}`,
      );
      await playAndLose(page);
      await page.evaluate(() =>
        localStorage.setItem("pirate-battle:scenario", "success"),
      );
      await expect(page.getByTestId("registration-status")).toHaveAttribute(
        "data-status",
        "saved",
        { timeout: 20_000 },
      );
      await page.getByTestId("main-menu").click();
      await page.getByTestId("history-button").click();
      await expect(page.getByTestId("history-row")).toHaveCount(1);
    });
  });

  test.describe("server unavailable", () => {
    test.use({ allowedConsole: EXPECTED_ERRORS });

    test("stays pending, survives reload and is saved when the API returns", async ({
      page,
    }) => {
      await page.goto(
        `/?${runtimeQuery({ manual: 1, seed: 7, scenario: "submit-unavailable" })}`,
      );
      await playAndLose(page);
      await expect(page.getByTestId("registration-status")).toHaveAttribute(
        "data-status",
        "pending",
        { timeout: 15_000 },
      );

      await page.reload();
      await expect(page.getByTestId("registration-status")).toHaveAttribute(
        "data-status",
        /pending|saving/,
      );

      await page.evaluate(() =>
        localStorage.setItem("pirate-battle:scenario", "success"),
      );
      // While automatic retries are running (tiny backoff in tests) the button
      // is re-rendered constantly, so Playwright's "stable element" click can
      // starve. Click it from inside the page until the match is saved.
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              document
                .querySelector<HTMLButtonElement>(
                  '[data-testid="retry-registration"]',
                )
                ?.click();
              return document
                .querySelector('[data-testid="registration-status"]')
                ?.getAttribute("data-status");
            }),
          { timeout: 20_000 },
        )
        .toBe("saved");
    });
  });

  test.describe("4xx rejection", () => {
    test.use({ allowedConsole: EXPECTED_ERRORS });

    test("is marked failed and allows manual retry", async ({ page }) => {
      await page.goto(
        `/?${runtimeQuery({ manual: 1, seed: 7, scenario: "http-4xx" })}`,
      );
      await playAndLose(page);
      await expect(page.getByTestId("registration-status")).toHaveAttribute(
        "data-status",
        "failed",
        { timeout: 15_000 },
      );
      await page.evaluate(() =>
        localStorage.setItem("pirate-battle:scenario", "success"),
      );
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              document
                .querySelector<HTMLButtonElement>(
                  '[data-testid="retry-registration"]',
                )
                ?.click();
              return document
                .querySelector('[data-testid="registration-status"]')
                ?.getAttribute("data-status");
            }),
          { timeout: 20_000 },
        )
        .toBe("saved");
    });
  });
});
