"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const TOTAL_IMAGES = 12;
const images = Array.from(
  { length: TOTAL_IMAGES },
  (_, i) => `/images/bg-${i + 1}.png`
);

const sloganTexts = [
  "Brings full automation to panel project tracking from start to finish.",
  "Every stage from planning and production to delivery is recorded with precision.",
  "Vendor integration and real-time progress updates ensure peak efficiency.",
  "Transparency isn't optional, it's the new standard.",
];

export function LoginBackgroundSlider() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [textOpacity, setTextOpacity] = useState(1);

  useEffect(() => {
    const imageTimer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(imageTimer);
  }, []);

  useEffect(() => {
    const textTimer = setInterval(() => {
      setTextOpacity(0);
      setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % sloganTexts.length);
        setTextOpacity(1);
      }, 500);
    }, 5000);
    return () => clearInterval(textTimer);
  }, []);

  return (
    <div className="absolute inset-0">
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt="Background"
          fill
          style={{ objectFit: "cover" }}
          className={cn(
            "transition-opacity duration-[1500ms]",
            index === currentImageIndex ? "opacity-100" : "opacity-0"
          )}
          priority={index === 0}
        />
      ))}

      <div className="absolute inset-0 bg-[#008A15]/40" />

      <div className="absolute bottom-12 right-12 text-right text-white">
        <p
          className="text-3xl font-semibold transition-opacity duration-500"
          style={{
            opacity: textOpacity,
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
          }}
        >
          {sloganTexts[currentTextIndex]}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          {sloganTexts.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === currentTextIndex
                  ? "w-8 bg-white"
                  : "w-2.5 bg-white/50"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
