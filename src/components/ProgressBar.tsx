import { useEffect, useState } from "react";

export default function ScrollProgressBar() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;
      const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
      // 橡皮筋回弹时 scrollTop 会越界，夹一下
      setScrollPercent(Math.min(100, Math.max(0, scrolled)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // z-[60] 压在 z-50 的固定导航之上 —— 原来是 z-3，被导航盖住，
  // 只有下滑收起导航时才短暂可见
  return (
    <div className="fixed top-0 left-0 z-[60] w-full">
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
