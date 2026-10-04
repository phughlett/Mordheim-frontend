import type { JSX } from "react"
import { ExperienceCheckbox } from "./expCheckBox"
import type React from "react";

interface HeroExpProps {
  experience: number;
}

export function HeroExp({ experience }: HeroExpProps) {

  const LEVEL_UP = [2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63, 69, 76, 83, 90]

  function expBoxes(): JSX.Element[] {
    let allBoxes = []
    for (let i = 1; i <= 90; ++i) {
      let props = {
        isLevelBox: LEVEL_UP.includes(i),
        isChecked: i<=experience,
        id: i.toString()
      }
      allBoxes.push(ExperienceCheckbox(props))

    }
    return allBoxes;
  }

  let boxes = expBoxes()

  return (
    <div className="border place-items-center grid sm: grid-cols-15 md:grid-cols-30 gap-1 py-1 max-w-250">
      {boxes}
    </div>
  )

}