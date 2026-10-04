interface ExperienceProps {
  experience: number
  handleExpChange: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
export function ExperienceBox({ experience, handleExpChange }: ExperienceProps) {

  const buttClass = "bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-2 border border-blue-500 hover:border-transparent rounded"

  return (


    <div className="grid grid-cols-3 gap-2 max-w-40 justify-self-center">
      <p className="flex justify-center col-span-3">Experience</p>
      <button name="minus" className={buttClass} onClick={handleExpChange}>
        -
      </button>
      <div className="flex items-center justify-center border min-h-10 min-w-10">
        <h1>{experience}</h1>
      </div>
      <button name="plus" className={buttClass} onClick={handleExpChange}>
        +
      </button>
    </div>

  )

}