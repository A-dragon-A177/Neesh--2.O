import newLogo from "@/assets/new-logo.png";

interface NeeshLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const NeeshLogo = ({ size = "md", showText = true, className = "" }: NeeshLogoProps) => {
  const sizeClasses = {
    sm: "h-8 sm:h-9 md:h-10",
    md: "h-10 sm:h-12 md:h-14",
    lg: "h-16 sm:h-20 md:h-24",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={newLogo} 
        alt="Neesh AI Logo" 
        className={`${sizeClasses[size]} w-auto object-contain mix-blend-multiply dark:mix-blend-normal`}
      />
    </div>
  );
};
export default NeeshLogo;
