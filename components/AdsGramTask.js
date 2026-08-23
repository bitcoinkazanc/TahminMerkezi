"use client";

import { useEffect, useRef } from "react";

export default function AdsGramTask() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (
      containerRef.current.querySelector(
        "adsgram-task"
      )
    ) {
      return;
    }

    const task =
      document.createElement(
        "adsgram-task"
      );

    task.setAttribute(
      "data-block-id",
      "task-44165"
    );

    containerRef.current.appendChild(task);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        minHeight: "100px",
        margin: "12px 0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  );
}