
interface ExperienceCheckboxProps {
  isLevelBox: boolean;
  isChecked: boolean;
  id: string;
}
export function ExperienceCheckbox({isLevelBox, isChecked, id}: ExperienceCheckboxProps) {
  let className = ""


  if(isLevelBox){
    className = "w-[1.2em] h-[1.2em] flex items-center justify-center text-base border-3 border-white"
  }else{
    className = "w-[1.2em] h-[1.2em] flex items-center justify-center text-base border border-white"
  }


  return (
    <div key={id} className={className}>
      {isChecked ? "x" : ""}
    </div>
  )

}