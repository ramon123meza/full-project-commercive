import React, { useState, useEffect } from "react";
import "./FadeView.css";

interface FadeViewProps {
  componentsArray: React.ReactNode[];
}

const FadeView: React.FC<FadeViewProps> = ({ componentsArray }) => {
  const [visibleComponents, setVisibleComponents] = useState<React.ReactNode[]>(
    []
  );
  const [index, setIndex] = useState(0); // Track the index in state

  useEffect(() => {
    if (index >= componentsArray.length) return; // Stop if all items are added

    const timer = setTimeout(
      () => {
        setVisibleComponents((prev) => [...prev, componentsArray[index]]);
        setIndex((prevIndex) => prevIndex + 1); // Increment index safely
      },
      index === 0 ? 3000 : 500
    ); // Show a new component every 2 seconds

    return () => clearTimeout(timer); // Cleanup timeout
  }, [index, componentsArray]);

  return (
    <div
      className="fade-container"
      // style={{ height: componentsArray.length * 50 + "px" }}
    >
      {visibleComponents.map((component, i) => (
        <div
          key={i}
          className="fade-component"
          style={{ animationDelay: `${i * 0.5}s` }}
        >
          {component}
        </div>
      ))}
    </div>
  );
};

export default FadeView;
