// frontend/src/components/ThemeToggle.jsx
import "./ThemeToggle.css";

export default function ThemeToggle({ theme, onToggle }) {
  // Xác định màu sắc "chấm tròn" đại diện cho từng theme
  const getSwatchStyle = () => {
    switch (theme) {
      case "light": return { background: "#faf8f6", border: "1px solid #d1d5db" };
      case "dark": return { background: "#080c10", border: "1px solid #3a5a76" };
      case "mint-pink": return { background: "linear-gradient(-225deg, #E3FDF5 0%, #FFE6FA 100%)" };
      case "rose-blue": return { background: "linear-gradient(to top, #f3e7e9 0%, #e3eeff 99%, #e3eeff 100%)" };
      case "peach": return { background: "linear-gradient(to top, #feada6 0%, #f5efef 100%)" };
      default: return { background: "#f8eedf" };
    }
  };

  // Xác định tên hiển thị
  const getThemeName = () => {
    const names = {
      "light": "Light",
      "dark": "Dark",
      "mint-pink": "Mint",
      "rose-blue": "Rose",
      "peach": "Peach"
    };
    return names[theme] || "Light";
  };

  return (
    <button
      className="theme-cycle-btn"
      onClick={onToggle}
      title={`Switch theme (Current: ${getThemeName()})`}
    >
      <div className="theme-swatch" style={getSwatchStyle()} />
      <span className="theme-name">{getThemeName()}</span>
    </button>
  );
}