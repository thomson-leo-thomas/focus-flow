"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// Types
export type LoadState = "steady" | "high-effort" | "strain";

export interface CognitiveLoadMetrics {
    loadScore: number;
    loadState: LoadState;
    focusMode: boolean;
    timeInStates: Record<LoadState, number>; // in seconds
    activeReadingTime: number; // in seconds
    isReadingActive: boolean;
    focusModeActivations: number;
    strainSustainedTime: number; // Track how long strain has been active
}

export interface CognitiveLoadActions {
    reportScrollUp: (intensity: "small" | "medium" | "large") => number; // returns number of rereads to record
    reportRelativeTime: (timeOnChunk: number, expectedTime: number, chunkId?: string, isPeriodic?: boolean) => { isStrain: boolean; isHighEffort: boolean; isSkimmed: boolean };
    reportHesitation: () => void;
    reportSmoothReading: () => void;
    startSession: () => void;
    pauseSession: () => void;
    endSession: () => void;
    resetSession: () => void;
}

export function useCognitiveLoad(): [CognitiveLoadMetrics, CognitiveLoadActions] {
    const [loadScore, setLoadScore] = useState(20);
    const [focusMode, setFocusMode] = useState(false);
    const [timeInStates, setTimeInStates] = useState<Record<LoadState, number>>({
        steady: 0,
        "high-effort": 0,
        strain: 0
    });
    const [focusModeActivations, setFocusModeActivations] = useState(0);
    const [isReadingActive, setIsReadingActive] = useState(false);
    const [activeReadingTime, setActiveReadingTime] = useState(0);
    const [strainSustainedTime, setStrainSustainedTime] = useState(0);

    const smoothReadingStartTime = useRef<number | null>(null);
    const loadRef = useRef(20);
    const behavioralConfirmation = useRef(false); // Track if a reread or hesitation occurred in the current chunk context
    const highEffortStreak = useRef(0);

    const updateLoad = useCallback((delta: number | ((current: number) => number)) => {
        setLoadScore((prev) => {
            let nextBase = typeof delta === "function" ? delta(prev) : prev + delta;
            const next = Math.min(Math.max(nextBase, 0), 100);
            loadRef.current = next;
            return next;
        });
    }, []);

    const reportScrollUp = useCallback((intensity: "small" | "medium" | "large") => {
        smoothReadingStartTime.current = null;
        behavioralConfirmation.current = true; // Any scroll up counts as behavioral signal

        if (intensity === "large") {
            updateLoad(2.0);
            return 3;
        }

        if (intensity === "medium") {
            updateLoad(1.0);
            return 2;
        }

        // Small Intensity (deltaY > 0)
        updateLoad(0.5);
        return 1;
    }, [updateLoad]);

    const lastReportedChunkId = useRef<string | null>(null);
    const lastReportedThreshold = useRef<number>(1.0); // 1: steady, 1.2: high effort, 1.6: strain

    const reportRelativeTime = useCallback((timeOnChunk: number, expectedTime: number, chunkId?: string, isPeriodic?: boolean) => {
        if (!expectedTime) return { isStrain: false, isHighEffort: false, isSkimmed: false };

        const ratio = timeOnChunk / expectedTime;
        const isSkimmed = ratio < 0.6;
        const isSteady = ratio >= 0.6 && ratio <= 1.2;
        const isHighEffort = ratio > 1.2 && ratio <= 1.6;
        const isPossibleStrain = ratio > 1.6;

        // Load adjustment logic (Only apply once when crossing thresholds or on final exit)
        const currentThreshold = isPossibleStrain ? 1.6 : (isHighEffort ? 1.2 : (isSteady ? 0.6 : 0));

        const isNewChunk = chunkId !== lastReportedChunkId.current;
        const isThresholdCrossed = currentThreshold > lastReportedThreshold.current;

        if (isNewChunk || isThresholdCrossed || !isPeriodic) {
            if (isPossibleStrain) {
                updateLoad(1.0);
            } else if (isHighEffort) {
                updateLoad(0.5);
                if (!isPeriodic) highEffortStreak.current += 1;
            } else if (isSteady && !isPeriodic) {
                updateLoad(-1.0);
                highEffortStreak.current = 0;
                behavioralConfirmation.current = false;
            }

            if (isPeriodic) {
                lastReportedChunkId.current = chunkId || null;
                lastReportedThreshold.current = currentThreshold;
            } else {
                lastReportedChunkId.current = null;
                lastReportedThreshold.current = 1.0;
            }
        }

        return {
            isStrain: isPossibleStrain && (behavioralConfirmation.current || highEffortStreak.current >= 2),
            isHighEffort,
            isSkimmed
        };
    }, [updateLoad]);

    const reportHesitation = useCallback(() => {
        updateLoad(1.0);
        behavioralConfirmation.current = true;
    }, [updateLoad]);

    const reportSmoothReading = useCallback(() => {
        updateLoad(-1.0);
        if (smoothReadingStartTime.current === null) {
            smoothReadingStartTime.current = Date.now();
        }
    }, [updateLoad]);

    // Session Control Actions
    const startSession = useCallback(() => setIsReadingActive(true), []);
    const pauseSession = useCallback(() => setIsReadingActive(false), []);
    const endSession = useCallback(() => setIsReadingActive(false), []);
    const resetSession = useCallback(() => {
        setIsReadingActive(false);
        setActiveReadingTime(0);
        setLoadScore(20);
        setTimeInStates({ steady: 0, "high-effort": 0, strain: 0 });
        setFocusModeActivations(0);
        setStrainSustainedTime(0);
        highEffortStreak.current = 0;
        behavioralConfirmation.current = false;
    }, []);

    // Drive current load state
    const currentLoadState: LoadState =
        (loadScore >= 65 && (behavioralConfirmation.current || highEffortStreak.current >= 2)) ? "strain" :
            loadScore >= 35 ? "high-effort" :
                "steady";

    // Main Loop: Decay + Session Tracking
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isReadingActive) return;

            // Natural load decay (slower if high effort)
            setLoadScore((prev) => {
                const decayRate = currentLoadState === "steady" ? 0.99 : 0.995;
                const next = Math.max(prev * decayRate, 0);
                loadRef.current = next;
                return next;
            });

            // Track Session Time
            setActiveReadingTime(prev => prev + 1);

            // Track Time in State
            setTimeInStates(prev => ({
                ...prev,
                [currentLoadState]: prev[currentLoadState] + 1
            }));

            // Track Sustained Strain
            if (currentLoadState === "strain") {
                setStrainSustainedTime(prev => prev + 1);
            } else {
                setStrainSustainedTime(0);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentLoadState, isReadingActive]);

    // Hysteresis & Recovery Logic for Focus Mode (Technical Strain)
    useEffect(() => {
        const isSmoothReadingLongEnough = () => {
            if (smoothReadingStartTime.current === null) return false;
            const duration = (Date.now() - smoothReadingStartTime.current) / 1000;
            return duration >= 25; // 20-30s threshold
        };

        if (loadScore >= 70 && !focusMode) {
            setFocusMode(true);
            setFocusModeActivations(prev => prev + 1);
            smoothReadingStartTime.current = null;
        } else if (loadScore <= 50 && focusMode && isSmoothReadingLongEnough()) {
            setFocusMode(false);
        }
    }, [loadScore, focusMode]);

    return [
        {
            loadScore,
            loadState: currentLoadState,
            focusMode,
            timeInStates,
            activeReadingTime,
            isReadingActive,
            focusModeActivations,
            strainSustainedTime
        },
        {
            reportScrollUp,
            reportRelativeTime,
            reportHesitation,
            reportSmoothReading,
            startSession,
            pauseSession,
            endSession,
            resetSession
        },
    ];
}
