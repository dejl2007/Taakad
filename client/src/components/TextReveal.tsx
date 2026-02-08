"use client"

import { motion } from "motion/react"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export const TextReveal = ({
  text,
  revealText,
  className,
}: {
  text: string
  revealText: string
  className?: string
}) => {
  const [widthPercentage, setWidthPercentage] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState(0)
  const [localWidth, setLocalWidth] = useState(0)
  const [isMouseOver, setIsMouseOver] = useState(false)

  useEffect(() => {
    if (containerRef.current) {
      const { left, width: localWidth } = containerRef.current.getBoundingClientRect()
      setLeft(left)
      setLocalWidth(localWidth)
    }
  }, [])

  function mouseMoveHandler(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    const { clientX } = event
    if (containerRef.current) {
      const relativeX = clientX - left
      setWidthPercentage((relativeX / localWidth) * 100)
    }
  }

  function mouseLeaveHandler() {
    setIsMouseOver(false)
    setWidthPercentage(0)
  }

  function mouseEnterHandler() {
    setIsMouseOver(true)
  }

  function touchMoveHandler(event: React.TouchEvent<HTMLDivElement>) {
    event.preventDefault()
    const clientX = event.touches[0]!.clientX
    if (containerRef.current) {
      const relativeX = clientX - left
      setWidthPercentage((relativeX / localWidth) * 100)
    }
  }

  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden cursor-pointer", className)}
      onMouseEnter={mouseEnterHandler}
      onMouseLeave={mouseLeaveHandler}
      onMouseMove={mouseMoveHandler}
      onTouchEnd={mouseLeaveHandler}
      onTouchMove={touchMoveHandler}
      onTouchStart={mouseEnterHandler}
      ref={containerRef}
      role="button"
      tabIndex={0}
    >
      {/* Revealed text layer */}
      <motion.div
        animate={
          isMouseOver
            ? {
                opacity: widthPercentage > 0 ? 1 : 0,
                clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
              }
            : {
                clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
              }
        }
        className="absolute z-20 will-change-transform bg-black w-full"
        style={{
          width: "100%",
        }}
        transition={isMouseOver ? { duration: 0 } : { duration: 0.4 }}
      >
        <p className="text-4xl md:text-6xl font-bold text-white text-center">{revealText}</p>
      </motion.div>

      {/* Base text layer */}
      <div className="overflow-hidden w-full text-center">
        <p className="text-4xl md:text-6xl font-bold text-gray-400">{text}</p>
      </div>
    </div>
  )
}

export default TextReveal
