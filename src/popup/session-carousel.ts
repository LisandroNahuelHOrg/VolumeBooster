/**
 * @fileoverview Helpers for the popup booster-session carousel layout.
 * @module popup/session-carousel
 */

import type { CaptureSessionState } from "../shared/types";

export const SESSION_CAROUSEL_VISIBLE_SLOTS = 3;

export interface SessionCarouselSessionItem {
  kind: "session";
  key: string;
  session: CaptureSessionState;
}

export interface SessionCarouselPlaceholderItem {
  kind: "placeholder";
  key: string;
  placeholderIndex: number;
}

export type SessionCarouselItem = SessionCarouselSessionItem | SessionCarouselPlaceholderItem;

export interface SessionCarouselModel {
  items: SessionCarouselItem[];
  visibleItems: SessionCarouselItem[];
  offset: number;
  maxOffset: number;
  visibleSlots: number;
  showNavigation: boolean;
  canScrollPrevious: boolean;
  canScrollNext: boolean;
}

export function clampSessionCarouselOffset(
  totalSessions: number,
  requestedOffset: number,
  visibleSlots = SESSION_CAROUSEL_VISIBLE_SLOTS
): number {
  const safeVisibleSlots = Math.max(1, Math.floor(visibleSlots));
  const safeRequestedOffset = Number.isFinite(requestedOffset) ? Math.floor(requestedOffset) : 0;
  const totalColumns = Math.max(totalSessions, safeVisibleSlots);
  const maxOffset = Math.max(0, totalColumns - safeVisibleSlots);

  return Math.min(Math.max(0, safeRequestedOffset), maxOffset);
}

export function shiftSessionCarouselOffset(
  totalSessions: number,
  currentOffset: number,
  direction: "previous" | "next",
  visibleSlots = SESSION_CAROUSEL_VISIBLE_SLOTS
): number {
  return clampSessionCarouselOffset(
    totalSessions,
    currentOffset + (direction === "next" ? 1 : -1),
    visibleSlots
  );
}

export function buildSessionCarouselModel(
  sessions: readonly CaptureSessionState[],
  requestedOffset: number,
  visibleSlots = SESSION_CAROUSEL_VISIBLE_SLOTS
): SessionCarouselModel {
  const safeVisibleSlots = Math.max(1, Math.floor(visibleSlots));
  const offset = clampSessionCarouselOffset(sessions.length, requestedOffset, safeVisibleSlots);
  const items: SessionCarouselItem[] = sessions.map((session) => ({
    kind: "session",
    key: `session-${session.tabId}`,
    session
  }));

  const placeholderCount = Math.max(0, safeVisibleSlots - items.length);

  for (let index = 0; index < placeholderCount; index += 1) {
    items.push({
      kind: "placeholder",
      key: `placeholder-${index}`,
      placeholderIndex: index
    });
  }

  const totalColumns = items.length;
  const maxOffset = Math.max(0, totalColumns - safeVisibleSlots);

  return {
    items,
    visibleItems: items.slice(offset, offset + safeVisibleSlots),
    offset,
    maxOffset,
    visibleSlots: safeVisibleSlots,
    showNavigation: sessions.length > safeVisibleSlots,
    canScrollPrevious: offset > 0,
    canScrollNext: offset < maxOffset
  };
}
