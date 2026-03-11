import { runBlankStringExceptionsAreUnknownCase } from "../callback/blank-string-exceptions-are-unknown.callback";

export function registerBlankStringExceptionsAreUnknownCase(): void {
  it("treats blank string exceptions as unknown runtime exceptions", runBlankStringExceptionsAreUnknownCase);
}
