import { create } from "zustand";

const useAuthStore = create((set) => ({
  admin: JSON.parse(localStorage.getItem("admin_user") || "null"),
  isLoggedIn: !!localStorage.getItem("admin_token"),
  login: (admin, token) => {
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify(admin));
    set({ admin, isLoggedIn: true });
  },
  logout: () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    set({ admin: null, isLoggedIn: false });
  },
}));

export default useAuthStore;
