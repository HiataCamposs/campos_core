export default function Spinner({ fullScreen = false }) {
  return (
    <div
      className={`flex items-center justify-center ${fullScreen ? "min-h-screen" : "py-12"}`}
    >
      <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
}
