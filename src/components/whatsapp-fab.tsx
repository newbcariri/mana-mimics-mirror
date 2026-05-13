export function WhatsAppFab() {
  return (
    <a
      href="https://wa.me/5581995724886"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-28 right-3 lg:bottom-5 lg:right-5 z-[60] flex items-center justify-center w-12 h-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
      style={{
        backgroundColor: "#25D366",
        boxShadow: "0 6px 20px rgba(37, 211, 102, 0.45)",
      }}
    >
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-40"
        style={{ backgroundColor: "#25D366" }}
        aria-hidden
      />
      <svg
        viewBox="0 0 32 32"
        className="relative w-6 h-6 text-white"
        fill="currentColor"
        aria-hidden
      >
        <path d="M19.11 17.21c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM16.03 5.33C10.13 5.33 5.34 10.12 5.34 16c0 1.94.51 3.83 1.49 5.5L5.33 26.67l5.31-1.39a10.6 10.6 0 0 0 5.39 1.46h.01c5.9 0 10.69-4.79 10.69-10.67 0-2.85-1.11-5.53-3.13-7.55a10.62 10.62 0 0 0-7.57-3.19zm0 19.36h-.01a8.84 8.84 0 0 1-4.51-1.24l-.32-.19-3.15.83.84-3.07-.21-.32a8.8 8.8 0 0 1-1.36-4.71c0-4.88 3.99-8.85 8.88-8.85 2.37 0 4.6.92 6.27 2.59a8.8 8.8 0 0 1 2.6 6.26c0 4.88-3.99 8.85-8.88 8.85z" />
      </svg>
    </a>
  );
}
