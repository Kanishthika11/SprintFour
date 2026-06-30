import React from "react";

export type ButtonVariant = "primary" | "secondary" | "icon" | "danger" | "nav" | "queue" | "worried";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isActive?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "secondary",
  isActive = false,
  children,
  className = "",
  style,
  ...props
}: ButtonProps) {
  let classes = "";
  let baseStyle: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontWeight: 500,
    fontSize: 13,
    borderRadius: "0px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "transform 0.15s ease, opacity 0.15s ease",
    border: "none",
    outline: "none",
  };

  if (variant === "primary") {
    // Primary CTA (Teal): background #0d9488, text white
    classes = "bg-[#0d9488] text-white px-4 py-2 font-semibold text-sm";
  } else if (variant === "secondary") {
    // Secondary (teal outline): border border-[#0d9488], text-[#0d9488]
    classes =
      "border border-[#0d9488] text-[#0d9488] px-4 py-2 text-sm bg-transparent font-semibold";
  } else if (variant === "icon") {
    // Icon buttons: transparent, text gray-500
    classes = "p-2 bg-transparent text-slate-500 hover:text-slate-500";
  } else if (variant === "danger") {
    // Danger: background #f87171 (red-400), text white
    classes = "bg-[#f87171] text-white px-4 py-2 font-semibold text-sm";
  } else if (variant === "queue") {
    // Review Queue: background #1f2937 (gray-800), text #f3f4f6 (gray-100)
    classes = "bg-[#1f2937] text-[#f3f4f6] px-4 py-2 font-semibold text-sm";
  } else if (variant === "worried") {
    // Worried Mode ON: background #fed7aa (amber-200), text #92400e (amber-900)
    classes = "bg-[#fed7aa] text-[#92400e] px-4 py-2 font-semibold text-sm";
  } else if (variant === "nav") {
    const activeClasses = isActive
      ? "text-teal-500 border-l-2 border-teal-500 font-bold"
      : "text-gray-400";
    classes = `w-full text-left pl-4 pr-3 py-2 text-sm bg-transparent ${activeClasses}`;
  }

  const [hover, setHover] = React.useState(false);

  // Subtle opacity or scale changes on hover, NO color/background changes
  const getHoverStyle = (): React.CSSProperties => {
    if (!hover) return {};
    if (variant === "nav") {
      return { borderLeft: "2px solid #14b8a6", color: "#14b8a6" }; // nav link custom accent
    }
    return {
      opacity: 0.9,
      transform: "scale(1.02)",
    };
  };

  return (
    <button
      className={`${classes} ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...baseStyle,
        ...getHoverStyle(),
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
