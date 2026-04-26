import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "lucasChallengeSession_v1";
const CHALLENGES = {
  easy: [
    "Eat an entire lime wedge down to the shell (video)",
    "Do a cartwheel on the dance floor (video) (wash your hands after)",
    "Recreate the titanic photo but you must find or create a good elevated location such as a staircase or standing on an elevated surface. (Photo)",
    "One group member has to piggy back another group member for 1 lap of the bar (video)",
    "Shot of milk or any other unconventional thing you can get from the bar (video)",
    "Swap a visible item of clothing with a teammate (before and after photos)",
    "Convince a stranger to trust fall (video)"
  ],
  medium: [
    "Order any canned carbonated beverage / soda and shotgun it (video)",
    "Set up phone inside and take a video of yourselves walking into the bar as if people care (video)",
    "pull up a chair to a table of strangers and get a photo with them (photo)",
    "Go up to the bartender and get a glass of water then chug the water agressively as soon as they hand it to you (video)"
  ],
  hard: [
    "Get a video of you doing something that loops perfectly as in when it ends and you play it again you start where you ended (actually hard)",
    "Stand on a chair and tell a joke - if nobody acknowledges then try again until you get reaction (video)",
    "You must convince a stranger to buy one drink for someone in your group",
    "Go order something from the bar but forget what you want mid sentence and hesitate and “umm”  for 10 seconds while the bar tender is waiting",
    "Ask a bald guy if you can kiss his head (video). He does not need to say yes."
  ]
};

function Icon({ type, className = "" }) {
  const symbols = {
    sparkle: "✦",
    warning: "!",
    check: "✓",
    reset: "↻"
  };

  return (
    <span className={`inline-flex items-center justify-center font-black leading-none ${className}`} aria-hidden="true">
      {symbols[type] || "•"}
    </span>
  );
}

function safeReadLocalStorage(key) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage.getItem(key);
}

function safeWriteLocalStorage(key, value) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(key, value);
}

function getSession() {
  try {
    const saved = safeReadLocalStorage(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.usedChallengeIds)) return null;
    if (!Array.isArray(parsed.history)) return null;

    return {
      completedCount: Number.isFinite(parsed.completedCount) ? parsed.completedCount : 0,
      usedChallengeIds: parsed.usedChallengeIds,
      currentOptions: parsed.currentOptions || null,
      selectedChallenge: parsed.selectedChallenge || null,
      history: parsed.history
    };
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    safeWriteLocalStorage(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // If storage is unavailable, the app still works for the current tab session.
  }
}

function createFreshSession() {
  return {
    completedCount: 0,
    usedChallengeIds: [],
    currentOptions: null,
    selectedChallenge: null,
    history: []
  };
}

function flattenChallenges() {
  const all = [];
  Object.entries(CHALLENGES).forEach(([difficulty, list]) => {
    list.forEach((text, index) => {
      all.push({ id: `${difficulty}-${index}`, difficulty, text });
    });
  });
  return all;
}

function getOdds(completedCount) {
  if (completedCount <= 1) return { easy: 1, medium: 0, hard: 0, warning: "Easy territory. Enjoy it while it lasts." };
  if (completedCount === 2) return { easy: 2 / 3, medium: 1 / 3, hard: 0, warning: "Medium challenges are now possible." };
  if (completedCount === 3) return { easy: 1 / 2, medium: 1 / 2, hard: 0, warning: "The streets are getting less forgiving." };
  if (completedCount === 4) return { easy: 1 / 4, medium: 3 / 4, hard: 0, warning: "Mostly medium now. Good luck." };
  if (completedCount === 5) return { easy: 0, medium: 2 / 3, hard: 1 / 3, warning: "Hard challenges are now unlocked. Regrettable." };
  if (completedCount === 6) return { easy: 0, medium: 1 / 2, hard: 1 / 2, warning: "This is officially dangerous for your dignity." };
  return { easy: 0, medium: 1 / 4, hard: 3 / 4, warning: "The streets have no mercy left." };
}

function weightedDifficulty(odds) {
  const roll = Math.random();
  if (roll < odds.easy) return "easy";
  if (roll < odds.easy + odds.medium) return "medium";
  return "hard";
}

function chooseOne(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function getAvailableChallenges(allChallenges, usedIds, preferredDifficulty) {
  return allChallenges.filter(
    challenge => challenge.difficulty === preferredDifficulty && !usedIds.includes(challenge.id)
  );
}

function getFallbackPool(allChallenges, usedIds) {
  return allChallenges.filter(challenge => !usedIds.includes(challenge.id));
}

function drawChallenge(allChallenges, usedIds, completedCount, alreadySelectedIds = []) {
  const excludedIds = [...usedIds, ...alreadySelectedIds];
  const odds = getOdds(completedCount);
  const difficulty = weightedDifficulty(odds);
  let pool = getAvailableChallenges(allChallenges, excludedIds, difficulty);

  if (pool.length === 0) {
    pool = getFallbackPool(allChallenges, excludedIds);
  }

  if (pool.length === 0) return null;
  return chooseOne(pool);
}

function difficultyLabel(difficulty) {
  if (difficulty === "easy") return "Easy";
  if (difficulty === "medium") return "Medium";
  return "Hard";
}

function difficultyClasses(difficulty) {
  if (difficulty === "easy") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (difficulty === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

function runSelfTests() {
  const all = flattenChallenges();

  console.assert(all.length === 30, "Expected 30 total challenges.");
  console.assert(getOdds(0).easy === 1 && getOdds(0).medium === 0 && getOdds(0).hard === 0, "Challenge 1 should be guaranteed easy.");
  console.assert(getOdds(1).easy === 1 && getOdds(1).medium === 0 && getOdds(1).hard === 0, "Challenge 2 should be guaranteed easy.");
  console.assert(getOdds(5).hard === 1 / 3, "After 5 completed challenges, hard should have a 1/3 chance.");

  const firstEasy = all.find(challenge => challenge.difficulty === "easy");
  const availableEasy = getAvailableChallenges(all, [firstEasy.id], "easy");
  console.assert(!availableEasy.some(challenge => challenge.id === firstEasy.id), "Used challenge should not appear in available pool.");

  const first = drawChallenge(all, [], 0);
  const second = drawChallenge(all, [], 0, first ? [first.id] : []);
  console.assert(!first || !second || first.id !== second.id, "The two options should not be identical.");
}

if (typeof window !== "undefined") {
  runSelfTests();
}

export default function App() {
  const allChallenges = useMemo(() => flattenChallenges(), []);
  const [session, setSession] = useState(() => getSession() || createFreshSession());
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  const odds = getOdds(session.completedCount);
  const remainingCount = allChallenges.length - session.usedChallengeIds.length;

  function handleDraw() {
    if (remainingCount <= 0) return;
    setIsSpinning(true);

    window.setTimeout(() => {
      const first = drawChallenge(allChallenges, session.usedChallengeIds, session.completedCount);
      const second = drawChallenge(
        allChallenges,
        session.usedChallengeIds,
        session.completedCount,
        first ? [first.id] : []
      );

      const options = [first, second].filter(Boolean);

      setSession(prev => ({
        ...prev,
        currentOptions: options,
        selectedChallenge: null
      }));
      setIsSpinning(false);
    }, 850);
  }

  function handleSelect(challenge) {
    setSession(prev => ({
      ...prev,
      selectedChallenge: challenge
    }));
  }

  function handleDone() {
    if (!session.selectedChallenge) return;

    setSession(prev => ({
      ...prev,
      completedCount: prev.completedCount + 1,
      usedChallengeIds: [...prev.usedChallengeIds, prev.selectedChallenge.id],
      history: [
        ...prev.history,
        {
          ...prev.selectedChallenge,
          completedAt: new Date().toISOString()
        }
      ],
      currentOptions: null,
      selectedChallenge: null
    }));
  }

  function handleReset() {
    const confirmed = window.confirm("Reset this phone's Lucas challenge session?");
    if (!confirmed) return;
    const fresh = createFreshSession();
    setSession(fresh);
    saveSession(fresh);
  }

  const hasOptions = session.currentOptions && session.currentOptions.length > 0;
  const hasSelected = Boolean(session.selectedChallenge);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-5 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white text-neutral-950 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-neutral-900 text-white px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Find Lucas</p>
                <h1 className="text-3xl font-black leading-tight mt-1">Challenge Machine</h1>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Icon type="sparkle" className="text-2xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-neutral-400">Completed</p>
                <p className="text-2xl font-black">{session.completedCount}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-neutral-400">Remaining</p>
                <p className="text-2xl font-black">{remainingCount}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 mb-5">
              <div className="flex gap-2 items-start">
                <Icon type="warning" className="h-5 w-5 mt-0.5 rounded-full bg-neutral-200 text-neutral-700 text-xs shrink-0" />
                <div>
                  <p className="font-bold text-sm">Current difficulty</p>
                  <p className="text-sm text-neutral-600 mt-1">{odds.warning}</p>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!hasOptions && !isSpinning && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <button
                    onClick={handleDraw}
                    disabled={remainingCount <= 0}
                    className="w-full rounded-3xl bg-neutral-950 text-white py-5 text-xl font-black shadow-lg active:scale-[0.98] transition disabled:opacity-40"
                  >
                    {remainingCount <= 0 ? "No Challenges Left" : "Summon Challenge"}
                  </button>

                  <p className="text-center text-xs text-neutral-500 mt-4">
                    You’ll get two options. Pick one. The other goes back into the stack.
                  </p>
                </motion.div>
              )}

              {isSpinning && (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="text-center py-10"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                    className="h-16 w-16 mx-auto rounded-full border-8 border-neutral-200 border-t-neutral-950"
                  />
                  <p className="font-black text-xl mt-5">Consulting the streets...</p>
                  <p className="text-sm text-neutral-500 mt-1">This may be regrettable.</p>
                </motion.div>
              )}

              {hasOptions && !isSpinning && (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Challenge #{session.completedCount + 1}</p>
                    <h2 className="text-2xl font-black mt-1">Choose your fate</h2>
                  </div>

                  {session.currentOptions.map((challenge, index) => {
                    const selected = session.selectedChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => handleSelect(challenge)}
                        className={`w-full text-left rounded-3xl border-2 p-4 transition active:scale-[0.99] ${
                          selected ? "border-neutral-950 bg-neutral-100" : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <span className="font-black">Option {index + 1}</span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${difficultyClasses(challenge.difficulty)}`}>
                            {difficultyLabel(challenge.difficulty)}
                          </span>
                        </div>
                        <p className="text-base leading-snug text-neutral-800">{challenge.text}</p>
                      </button>
                    );
                  })}

                  <button
                    onClick={handleDone}
                    disabled={!hasSelected}
                    className="w-full rounded-3xl bg-neutral-950 text-white py-4 text-lg font-black shadow-lg active:scale-[0.98] transition disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    <Icon type="check" className="h-5 w-5 rounded-full border border-white/50 text-sm" />
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {session.history.length > 0 && (
              <div className="mt-6 border-t border-neutral-200 pt-4">
                <p className="text-sm font-black mb-2">Completed history</p>
                <div className="space-y-2 max-h-40 overflow-auto pr-1">
                  {session.history.slice().reverse().map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="text-xs bg-neutral-50 border border-neutral-200 rounded-2xl p-3">
                      <span className={`inline-block mb-1 px-2 py-0.5 rounded-full border font-bold ${difficultyClasses(item.difficulty)}`}>
                        {difficultyLabel(item.difficulty)}
                      </span>
                      <p className="text-neutral-700">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="mt-6 w-full text-neutral-500 text-sm flex items-center justify-center gap-2 py-2"
            >
              <Icon type="reset" className="h-4 w-4 text-base" />
              Reset this phone
            </button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-neutral-500 mt-4 px-4">
          Do not use private browsing. Photo or video evidence required for all challenges.
        </p>
      </div>
    </main>
  );
}
