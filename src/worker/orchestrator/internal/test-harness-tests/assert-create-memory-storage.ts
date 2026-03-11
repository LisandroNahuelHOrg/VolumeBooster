import { createMemoryStorage } from "../../test-harness";

it("createMemoryStorage_persists_and_reads_key_selections_from_memory_area", async () => {
  const { area } = createMemoryStorage();

  await area.set({ first: 1, second: 2 });

  expect(await area.get()).toEqual({ first: 1, second: 2 });
  expect(await area.get("first")).toEqual({ first: 1 });
  expect(await area.get(["second", "missing"])).toEqual({ second: 2, missing: undefined });

  await area.set({ first: 3, third: 4 });

  expect(await area.get()).toEqual({ first: 3, second: 2, third: 4 });
});
