"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";

export default function QuizWidget({ quizData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  if (!quizData || quizData.length === 0) return null;

  const currentQ = quizData[currentIndex];

  const handleSelect = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    if (idx === currentQ.answerIndex) {
      setScore(s => s + 1);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#a855f7", "#ec4899", "#3b82f6"]
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < quizData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOpt(null);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    const isPerfect = score === quizData.length;
    return (
      <div className="quiz-widget result-card animate-enter">
        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Quiz Completed! 🎉</h3>
        <p style={{ fontSize: "1.25rem", color: isPerfect ? "var(--primary)" : "var(--text-secondary)", margin: "0.5rem 0" }}>
          You scored <strong>{score}</strong> out of {quizData.length}
        </p>
        <button className="refinement-btn" onClick={() => { setCurrentIndex(0); setSelectedOpt(null); setScore(0); setShowResult(false); }}>
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-widget animate-enter">
      <div className="quiz-header">
        <span className="quiz-progress">Question {currentIndex + 1} of {quizData.length}</span>
        <span className="quiz-score">Score: {score}</span>
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
