"use client";

import { useState, useCallback } from "react";

export interface FrictionData {
    rereads: number;
    longPauses: number;
    totalTime: number;
    excessiveTime: boolean;
    score: number;
    avgLoad: number;
    loadSamples: number[];
    isSkimmed: boolean;
}

export type FrictionMap = Record<string, FrictionData>;

export function useFrictionTracker() {
    const [frictionMap, setFrictionMap] = useState<FrictionMap>({});

    const updateFriction = useCallback((chunkId: string, payload: { type: "reread" | "visit_time"; time?: number; expected?: number; amount?: number }) => {
        setFrictionMap((prev) => {
            const current = prev[chunkId] || {
                rereads: 0,
                longPauses: 0,
                totalTime: 0,
                excessiveTime: false,
                score: 0,
                avgLoad: 0,
                loadSamples: [],
                isSkimmed: false
            };
            const next = { ...current };

            if (payload.type === "reread") {
                next.rereads += (payload.amount ?? 1);
                next.isSkimmed = false; // Rereading cancels skimming
            } else if (payload.type === "visit_time" && payload.time && payload.expected) {
                next.totalTime += payload.time;

                // Track "long pause" per visit
                if (payload.time > payload.expected * 1.6) {
                    next.longPauses += 1;
                }

                // Track cumulative "excessive time"
                if (next.totalTime > payload.expected * 1.6) {
                    next.excessiveTime = true;
                }
            }

            // frictionScore = (rereads * 2) + (long_pauses * 1) + (excessive_time_flag ? 1 : 0)
            next.score = (next.rereads * 2) + (next.longPauses * 1) + (next.excessiveTime ? 1 : 0);

            return { ...prev, [chunkId]: next };
        });
    }, []);

    const markAsSkimmed = useCallback((chunkId: string) => {
        setFrictionMap((prev) => {
            const current = prev[chunkId] || {
                rereads: 0,
                longPauses: 0,
                totalTime: 0,
                excessiveTime: false,
                score: 0,
                avgLoad: 0,
                loadSamples: [],
                isSkimmed: false
            };
            if (current.rereads > 0) return prev; // Don't mark as skimmed if already reread

            return {
                ...prev,
                [chunkId]: { ...current, isSkimmed: true }
            };
        });
    }, []);

    const recordLoadSample = useCallback((chunkId: string, load: number) => {
        setFrictionMap((prev) => {
            const current = prev[chunkId] || {
                rereads: 0,
                longPauses: 0,
                totalTime: 0,
                excessiveTime: false,
                score: 0,
                avgLoad: 0,
                loadSamples: [],
                isSkimmed: false
            };
            const nextSamples = [...current.loadSamples, load];
            const nextAvg = nextSamples.reduce((a, b) => a + b, 0) / nextSamples.length;

            return {
                ...prev,
                [chunkId]: {
                    ...current,
                    loadSamples: nextSamples,
                    avgLoad: nextAvg
                }
            };
        });
    }, []);

    const getTopFrictionChunks = useCallback((count: number = 3) => {
        return Object.entries(frictionMap)
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, count)
            .map(([id, data]) => ({ id, ...data }));
    }, [frictionMap]);

    return {
        frictionMap,
        updateFriction,
        markAsSkimmed,
        recordLoadSample,
        getTopFrictionChunks,
    };
}
