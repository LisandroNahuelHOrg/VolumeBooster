import { UI_FONT_STACK } from "../../shared/ui-font-stack";

export const fallbackToastRootStyle = {
  position: "fixed",
  top: "16px",
  right: "16px",
  zIndex: "2147483647",
  width: "min(360px, calc(100vw - 24px))",
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(15, 22, 31, 0.96)",
  border: "1px solid rgba(255, 177, 64, 0.36)",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.32)",
  color: "#f7f3ed",
  fontFamily: UI_FONT_STACK
} satisfies Partial<CSSStyleDeclaration>;

export const fallbackToastTitleStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "-0.01em"
} satisfies Partial<CSSStyleDeclaration>;

export const fallbackToastBodyStyle = {
  margin: "0",
  fontSize: "13px",
  lineHeight: "1.45",
  fontWeight: "500"
} satisfies Partial<CSSStyleDeclaration>;

export const fallbackToastActionsStyle = {
  display: "flex",
  gap: "8px",
  marginTop: "14px"
} satisfies Partial<CSSStyleDeclaration>;

export const fallbackToastPrimaryButtonStyle = {
  appearance: "none",
  border: "none",
  borderRadius: "999px",
  padding: "10px 14px",
  background: "#f7b04c",
  color: "#11161e",
  fontFamily: UI_FONT_STACK,
  fontWeight: "700",
  fontSize: "12px",
  letterSpacing: "0.03em",
  cursor: "pointer"
} satisfies Partial<CSSStyleDeclaration>;

export const fallbackToastSecondaryButtonStyle = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "999px",
  padding: "10px 14px",
  background: "transparent",
  color: "#f7f3ed",
  fontFamily: UI_FONT_STACK,
  fontWeight: "600",
  fontSize: "12px",
  letterSpacing: "0.02em",
  cursor: "pointer"
} satisfies Partial<CSSStyleDeclaration>;
