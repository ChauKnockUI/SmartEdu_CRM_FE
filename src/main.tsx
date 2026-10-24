import { createRoot } from "react-dom/client";

// Console Super Admin chạy trên host admin.* (hoặc /platform khi dev); còn lại là ứng dụng trung tâm.
const isPlatform =
  window.location.hostname.startsWith("admin.") ||
  window.location.pathname === "/platform" ||
  window.location.pathname.startsWith("/platform/");

const root = document.getElementById("root")!;

if (isPlatform) {
  import("./platform/PlatformApp").then((m) => m.mountPlatform(root));
} else {
  // App đã tự bọc AuthProvider; bọc thêm ở đây làm /auth/me bị gọi hai lần mỗi lần tải trang.
  Promise.all([import("./app/App.tsx"), import("./styles/index.css")]).then(([{ default: App }]) => {
    createRoot(root).render(<App />);
  });
}
