"use client";

import React, { useState, useMemo } from "react";
import confetti from "canvas-confetti";

export default function QuizWidget({ quizData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState([]);

  if (!quizData || quizData.length === 0) return null;

  const currentQ = quizData[currentIndex];
  const progress = ((currentIndex + (selectedOpt !== null ? 1 : 0)) / quizData.length) * 100;
  const scorePercent = currentIndex > 0 ? Math.round((score / currentIndex) * 100) : 0;

  const difficulty = currentQ.difficulty || (currentIndex < quizData.length * 0.3 ? 'Easy' : currentIndex < quizData.length * 0.7 ? 'Medium' : 'Hard');
  const diffColor = difficulty === 'Easy' ? '#10b981' : difficulty === 'Medium' ? '#f59e0b' : '#ef4444';

  const handleSelect = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    const isCorrect = idx === currentQ.answerIndex;
    if (isCorrect) {
      setScore(s => s + 1);
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.75 },
        colors: ["#a855f7", "#ec4899", "#3b82f6", "#10b981"]
      });
    }
    setAnswers(prev => [...prev, { question: currentIndex, selected: idx, correct: currentQ.answerIndex, isCorrect }]);
  };

  const handleNext = () => {
    if (currentIndex < quizData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOpt(null);
    } else {
      setShowResult(true);
      if (score >= quizData.length * 0.8) {
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors: ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"] });
      }
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOpt(null);
    setScore(0);
    setShowResult(false);
    setAnswers([]);
  };

  const handleShare = () => {
    const text = `🎯 I scored ${score}/${quizData.length} (${Math.round((score/quizData.length)*100)}%) on a LACUNEX AI Quiz! Try it yourself at lacunex.ai`;
    if (navigator.share) {
      navigator.share({ title: "LACUNEX Quiz Score", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  if (showResult) {
    const pct = Math.round((score / quizData.length) * 100);
    const isPerfect = score === quizData.length;
    const isGreat = pct >= 80;
    const emoji = isPerfect ? '🏆' : isGreat ? '🌟' : pct >= 50 ? '👍' : '📚';
    const message = isPerfect ? 'Perfect Score!' : isGreat ? 'Excellent Work!' : pct >= 50 ? 'Good Effort!' : 'Keep Practicing!';

    return (
      <div className="quiz-widget result-card animate-enter">
        <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>{emoji}</div>
        <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.2rem" }}>{message}</h3>
        <div style={{ margin: "12px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: isGreat ? "#10b981" : "#f59e0b" }}>{score}/{quizData.length}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Correct</div>
          </div>
          <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: isGreat ? "#10b981" : "#f59e0b" }}>{pct}%</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Accuracy</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", margin: "12px 0", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: isGreat ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #f59e0b, #fbbf24)", borderRadius: "3px", transition: "width 1s ease" }} />
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          <button className="refinement-btn" onClick={handleRetake} style={{ flex: 1, minWidth: "120px" }}>
            🔄 Retake Quiz
          </button>
          <button className="refinement-btn" onClick={handleShare} style={{ flex: 1, minWidth: "120px" }}>
            📤 Share Score
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-widget animate-enter">
      {/* Progress bar */}
      <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", marginBottom: "12px", overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #a855f7, #ec4899)", borderRadius: "2px", transition: "width 0.4s ease" }} />
      </div>
      <div className="quiz-header">
        <span className="quiz-progress">
          Q{currentIndex + 1}/{quizData.length}
          <span style={{ marginLeft: "8px", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", background: `${diffColor}22`, color: diffColor, fontWeight: 600 }}>
            {difficulty}
          </span>
        </span>
        <span className="quiz-score" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          ⭐ {score}
          {currentIndex > 0 && <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>({scorePercent}%)</span>}
        </span>
      </div>
      <div className="quiz-question">{currentQ.q}</div>
      <div className="quiz-options">
        {currentQ.options.map((opt, i) => {
          let stateClass = "";
          if (selectedOpt !== null) {
            if (i === currentQ.answerIndex) stateClass = "correct";
            else if (i === selectedOpt) stateClass = "wrong";
            else stateClass = "disabled";
          }
          return (
            <button
              key={i}
              className={`quiz-option ${stateClass}`}
              onClick={() => handleSelect(i)}
              disabled={selectedOpt !== null}
            >
              <div className="quiz-opt-letter">{String.fromCharCode(65 + i)}</div>
              <div className="quiz-opt-text">{opt}</div>
              {selectedOpt !== null && i === currentQ.answerIndex && <span style={{ marginLeft: "auto", fontSize: "1rem" }}>✓</span>}
              {selectedOpt !== null && i === selectedOpt && i !== currentQ.answerIndex && <span style={{ marginLeft: "auto", fontSize: "1rem" }}>✗</span>}
            </button>
          );
        })}
      </div>
      {selectedOpt !== null && (
        <div className="quiz-feedback animate-enter">
          <p><strong>{selectedOpt === currentQ.answerIndex ? '✅ Correct!' : '❌ Incorrect.'}</strong> {currentQ.reason}</p>
          <button className="quiz-next-btn" onClick={handleNext}>
            {currentIndex < quizData.length - 1 ? 'Next Question ➔' : 'View Results ➔'}
          </button>
        </div>
      )}
    </div>
  );
}
