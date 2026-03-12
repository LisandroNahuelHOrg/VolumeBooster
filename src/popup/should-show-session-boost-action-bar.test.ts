describe("shouldShowSessionBoostActionBar", () => {
  it("shows immediately for local pending edits and otherwise follows the worker prompt state", async () => {
    const { shouldShowSessionBoostActionBar } = await import("./should-show-session-boost-action-bar");
    const viewModel = {
      currentTab: { tabId: 7 },
      sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false }
    };

    expect(shouldShowSessionBoostActionBar(viewModel as never, false, false, true)).toBe(true);
    expect(shouldShowSessionBoostActionBar(viewModel as never, false, false, false)).toBe(true);
    expect(
      shouldShowSessionBoostActionBar(
        {
          currentTab: { tabId: 7 },
          sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: true }
        } as never,
        false,
        false,
        false
      )
    ).toBe(false);
  });

  it("stays hidden in settings view, without a current tab, or after a local dismiss", async () => {
    const { shouldShowSessionBoostActionBar } = await import("./should-show-session-boost-action-bar");

    expect(shouldShowSessionBoostActionBar({ currentTab: { tabId: 7 } } as never, true, false, true)).toBe(false);
    expect(shouldShowSessionBoostActionBar({ currentTab: null } as never, false, false, true)).toBe(false);
    expect(shouldShowSessionBoostActionBar({ currentTab: { tabId: 7 } } as never, false, true, true)).toBe(false);
  });
});
