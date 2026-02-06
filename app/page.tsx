"use client";

import { useState } from "react";
import { LandingPage } from "@/components/landing-page";
import { ReadingView } from "@/components/reading-view";
import { ParsedChunk } from "@/lib/pdf-ingest";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const [chunks, setChunks] = useState<ParsedChunk[] | null>(null);

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
        {!chunks ? (
          <motion.div
            key="landing"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <LandingPage onDocumentLoaded={setChunks} />
          </motion.div>
        ) : (
          <motion.div
            key="reading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <ReadingView
              chunks={chunks}
              onBack={() => setChunks(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
