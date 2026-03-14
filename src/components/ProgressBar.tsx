import { useEffect, useState } from "react";

export default function ScrollProgressBar() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;
      const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollPercent(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 z-3 w-full">
      <div
        className="bg-accent h-1 transition-[width] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]"
        style={{
          width: `${scrollPercent}%`,
          transitionDuration: "var(--motion-duration-fast)",
        }}
      ></div>
    </div>
  );
}
