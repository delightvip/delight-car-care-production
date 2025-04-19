import React, { useState, useEffect } from "react";

// مكون Color Picker بسيط بدون مكتبة خارجية (input[type=color])
export default function ColorThemePicker() {
  // اللون الافتراضي هو الأزرق الحالي
  const [color, setColor] = useState<string>(() => {
    return localStorage.getItem("custom-theme-color") || "#2563eb";
  });

  useEffect(() => {
    // عند تغيير اللون، يحدث متغير الـ CSS مباشرة للوضعين معاً
    document.documentElement.style.setProperty("--primary", hexToHSL(color));
    // تحديث متغير الوضع الداكن أيضاً
    const darkRoot = document.documentElement.classList.contains('dark');
    if (darkRoot) {
      document.documentElement.style.setProperty("--primary", hexToHSL(color));
    }
    localStorage.setItem("custom-theme-color", color);
  }, [color]);

  // دالة تحويل HEX إلى HSL (للتوافق مع متغيرات Tailwind)
  function hexToHSL(hex: string) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    return `${h} ${s}% ${l}%`;
  }

  return (
    <div style={{ direction: "rtl", display: "flex", alignItems: "center", gap: 8 }}>
      {/* تم إزالة الوصف ليظهر فقط الباليتة */}
      <input
        id="color-picker"
        type="color"
        value={color}
        onChange={e => setColor(e.target.value)}
        style={{ width: 36, height: 36, border: "none", borderRadius: "50%", cursor: "pointer" }}
      />
    </div>
  );
}
