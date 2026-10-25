"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
  OBSERVATORY_POSITIONS,
  markerStateForObservatoryPosition,
  type ObservatoryPosition,
} from "@/features/visual-computing/observatory-model";
import { useObservatoryStateManager } from "./ObservatoryStateManager";
import styles from "./Observatory.module.css";

const TITLE_ID = "observatory-navigation-title";
const DISCLOSURE_ID = "observatory-navigation-disclosure";
const INSTRUCTIONS_ID = "observatory-navigation-instructions";
const ACTIVE_POSITIONS = OBSERVATORY_POSITIONS.slice(
  0,
  OBSERVATORY_ACTIVE_POSITION_COUNT,
);
const RESERVED_POSITIONS = OBSERVATORY_POSITIONS.slice(
  OBSERVATORY_ACTIVE_POSITION_COUNT,
);

type PositionStyle = CSSProperties & {
  readonly "--observatory-position-angle": string;
  readonly "--observatory-counter-angle": string;
};

type RingStyle = CSSProperties & {
  readonly "--observatory-dial-rotation": string;
  readonly "--observatory-dial-counter-rotation": string;
};

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function positionStyle(position: ObservatoryPosition): PositionStyle {
  return {
    "--observatory-position-angle": `${position.angleRadians}rad`,
    "--observatory-counter-angle": `${-position.angleRadians}rad`,
  };
}

function positionPurpose(position: ObservatoryPosition): string {
  return position.availability === "navigable-instrument"
    ? `${position.label} mounted scientific instrument`
    : `${position.label} framework placeholder`;
}

export function ObservatoryNavigation() {
  const {
    state,
    reducedMotion,
    navigationSettled,
    navigateToPosition,
  } = useObservatoryStateManager();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<number, HTMLButtonElement>());
  const safeCurrentIndex = ACTIVE_POSITIONS.some(
    (position) => position.index === state.activePositionIndex,
  )
    ? state.activePositionIndex
    : ACTIVE_POSITIONS[0]?.index ?? 0;
  const [rovingIndex, setRovingIndex] = useState(safeCurrentIndex);
  const [announcement, setAnnouncement] = useState("");
  const settledIndexRef = useRef(safeCurrentIndex);
  const ringStyle: RingStyle = {
    "--observatory-dial-rotation": `${state.dialRotationRad}rad`,
    "--observatory-dial-counter-rotation":
      `${-state.dialRotationRad}rad`,
  };

  useEffect(() => {
    const toolbarHasFocus = toolbarRef.current?.contains(
      document.activeElement,
    );
    if (!toolbarHasFocus) setRovingIndex(safeCurrentIndex);
  }, [safeCurrentIndex]);

  useEffect(() => {
    if (!navigationSettled) return;
    if (settledIndexRef.current === safeCurrentIndex) return;
    const timer = window.setTimeout(() => {
      const position = ACTIVE_POSITIONS.find(
        (candidate) => candidate.index === safeCurrentIndex,
      );
      if (!position) return;
      settledIndexRef.current = safeCurrentIndex;
      setAnnouncement(
        `Observatory position ${twoDigits(position.ordinal)} of 14 settled. `
        + `${positionPurpose(position)}.`,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [navigationSettled, safeCurrentIndex]);

  const moveRovingFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    positionIndex: number,
  ) => {
    const currentArrayIndex = ACTIVE_POSITIONS.findIndex(
      (position) => position.index === positionIndex,
    );
    let nextArrayIndex = currentArrayIndex;
    if (event.key === "Home") {
      nextArrayIndex = 0;
    } else if (event.key === "End") {
      nextArrayIndex = ACTIVE_POSITIONS.length - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextArrayIndex = Math.min(
        ACTIVE_POSITIONS.length - 1,
        currentArrayIndex + 1,
      );
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextArrayIndex = Math.max(0, currentArrayIndex - 1);
    } else {
      return;
    }
    event.preventDefault();
    const nextPosition = ACTIVE_POSITIONS[nextArrayIndex];
    if (!nextPosition) return;
    setRovingIndex(nextPosition.index);
    buttonRefs.current.get(nextPosition.index)?.focus();
  };

  return (
    <nav
      className={styles.navigation}
      aria-labelledby={TITLE_ID}
      aria-describedby={`${DISCLOSURE_ID} ${INSTRUCTIONS_ID}`}
    >
      <header className={styles.navigationHeading}>
        <p>CALIBRATED OBSERVATORY DIAL</p>
        <h2 id={TITLE_ID}>Scientific instrument positions</h2>
      </header>
      <p id={DISCLOSURE_ID} className={styles.disclosure}>
        Positions 01 through 06 contain the mounted Solar Digital Twin,
        Atmospheric Observation, Annual Energy Observatory, and Solar Array
        Engineering instruments, followed by Scenario Comparison and Battery
        &amp; Energy Flow. Position 07 remains a navigable framework placeholder.
        Positions 08 through 14 are reserved and unavailable.
      </p>
      <p id={INSTRUCTIONS_ID} className={styles.instructions}>
        Use arrow keys to move focus among positions 01 through 07. Home and
        End move to the first and last active positions. Press Enter or Space
        to navigate. Focus does not wrap into reserved positions.
      </p>

      <div
        className={styles.ring}
        data-motion={reducedMotion ? "reduced" : "full"}
        style={ringStyle}
      >
        <div
          ref={toolbarRef}
          className={styles.activePositions}
          role="toolbar"
          aria-label="Navigable observatory positions"
        >
          {ACTIVE_POSITIONS.map((position) => {
            const positionState = markerStateForObservatoryPosition(
              position.index,
              safeCurrentIndex,
            );
            const current = position.index === safeCurrentIndex;
            return (
              <button
                key={position.id}
                ref={(element) => {
                  if (element) {
                    buttonRefs.current.set(position.index, element);
                  } else {
                    buttonRefs.current.delete(position.index);
                  }
                }}
                className={styles.positionButton}
                type="button"
                tabIndex={position.index === rovingIndex ? 0 : -1}
                data-observatory-initial-focus={
                  current ? "true" : undefined
                }
                aria-current={current ? "location" : undefined}
                aria-label={`Move to observatory position ${twoDigits(position.ordinal)}, ${positionPurpose(position)}`}
                data-position-index={position.ordinal}
                data-position-state={positionState}
                data-position-availability={position.availability}
                style={positionStyle(position)}
                onFocus={() => setRovingIndex(position.index)}
                onKeyDown={(event) =>
                  moveRovingFocus(event, position.index)
                }
                onClick={() => navigateToPosition(position.index)}
              >
                <span className={styles.positionOrdinal} aria-hidden="true">
                  {twoDigits(position.ordinal)}
                </span>
                <span className={styles.positionLabel} aria-hidden="true">
                  {position.label}
                </span>
              </button>
            );
          })}
        </div>

        <ol
          className={styles.reservedPositions}
          start={OBSERVATORY_ACTIVE_POSITION_COUNT + 1}
          aria-label="Reserved observatory positions"
        >
          {RESERVED_POSITIONS.map((position) => (
            <li
              key={position.id}
              className={styles.reservedPosition}
              data-position-index={position.ordinal}
              data-position-state="reserved"
              data-position-availability={position.availability}
              style={positionStyle(position)}
            >
              <span>
                <span
                  className={styles.reservedOrdinal}
                  aria-hidden="true"
                >
                  {twoDigits(position.ordinal)}
                </span>
                <span className={styles.screenReaderOnly}>
                  {`Observatory position ${twoDigits(position.ordinal)}, ${position.label} framework position, reserved and unavailable in this milestone.`}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <div className={styles.calibrationMark} aria-hidden="true" />
      </div>

      <div
        className={styles.screenReaderOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </nav>
  );
}
