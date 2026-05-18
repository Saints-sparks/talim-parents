import logo from "../assets/logo.svg";

const talimLetters = ["T", "a", "l", "i", "m"];

export default function ModernLoader({ visible }) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      role="status"
      aria-live="polite"
      aria-label="Signing in"
    >
      <div className="flex flex-col items-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-400 blur-xl animate-talim-glow" />
          <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 shadow-2xl animate-talim-logo">
            <img
              src={logo}
              alt="Talim Logo"
              className="h-12 w-12 brightness-0 invert"
            />
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {talimLetters.map((letter, index) => (
            <span
              key={letter}
              className="text-4xl font-bold text-gray-800 animate-talim-letter"
              style={{
                animationDelay: `${index * 0.1}s`,
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        <div className="flex space-x-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-blue-600 animate-talim-dot"
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
