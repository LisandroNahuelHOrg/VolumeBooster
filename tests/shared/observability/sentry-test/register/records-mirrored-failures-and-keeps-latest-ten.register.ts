import { runRecordsMirroredFailuresAndKeepsLatestTenCase } from "../callback/records-mirrored-failures-and-keeps-latest-ten.callback";

export function registerRecordsMirroredFailuresAndKeepsLatestTenCase(): void {
  it("records mirrored transport failures and keeps only the latest ten entries", runRecordsMirroredFailuresAndKeepsLatestTenCase);
}
